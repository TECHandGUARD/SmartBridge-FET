import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CameraOff, Mic, MicOff, MonitorUp, PhoneOff, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const SIGNAL_KINDS = new Set(['offer','answer','ice','ready','leave']);
const liveWindowMessage = 'The classroom opens 20 minutes before a confirmed session and closes 30 minutes after it ends.';
const errors = error => error instanceof Error ? error.message : 'Unable to connect. Try again.';
const getMedia = () => {
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error('Your browser does not support live video. Try an updated Chrome, Edge or Safari browser.');
  if (!window.isSecureContext) throw new Error('Video requires a secure HTTPS connection.');
  return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
};

export default function LiveClassroom() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState('Checking your booking…');
  const [error, setError] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const localStream = useRef(null);
  const screenStream = useRef(null);
  const peer = useRef(null);
  const channel = useRef(null);
  const pendingIce = useRef([]);
  const lastSignal = useRef(null);
  const sentOffer = useRef(false);
  const sessionId = useRef(null);
  const remoteSession = useRef(null);
  const retiredSessions = useRef(new Set());
  const signalQueue = useRef(Promise.resolve());
  const pollTimer = useRef(null);
  const accessTimer = useRef(null);
  const joining = useRef(false);
  const generation = useRef(0);
  const [connecting, setConnecting] = useState(false);
  const active = useRef(false);
  const role = booking?.tutor_id === user?.id ? 'tutor' : 'learner';
  const recipientId = booking ? (role === 'tutor' ? booking.student_id : booking.tutor_id) : null;


  const send = useCallback(async (kind, payload = {}) => {
    if (!SIGNAL_KINDS.has(kind) || !booking || !user?.id || !recipientId || !active.current) return;
    const { error: sendError } = await supabase.from('classroom_signals').insert({
      booking_id: booking.id, sender_id: user.id, recipient_id: recipientId, kind,
      payload: { ...payload, session_id: sessionId.current,
        target_session: kind === 'ready' && !payload.ack ? null : remoteSession.current }
    });
    if (sendError) throw sendError;
  }, [booking,recipientId,user?.id]);

  const drainIce = useCallback(async () => {
    const pc = peer.current;
    if (!pc?.remoteDescription) return;
    while (pendingIce.current.length) {
      const candidate = pendingIce.current.shift();
      try { await pc.addIceCandidate(candidate); } catch { /* stale network candidate */ }
    }
  }, []);

  const makeOffer = useCallback(async () => {
    const pc = peer.current;
    if (!pc || sentOffer.current || !active.current) return;
    sentOffer.current = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (!active.current || peer.current !== pc) return;
      await send('offer',{ sdp: pc.localDescription?.sdp, type: 'offer' });
      if (active.current) setStatus('Invitation sent. Waiting for learner…');
    } catch (e) { sentOffer.current = false; if (pc.signalingState === 'have-local-offer') await pc.setLocalDescription({type:'rollback'}).catch(()=>{}); if (active.current) setError(errors(e)); }
  }, [send]);

  const createPeer = useCallback(() => {
    peer.current?.close();
    pendingIce.current = [];
    sentOffer.current = false;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peer.current = pc;
      localStream.current.getTracks().forEach(track => pc.addTrack(
        track.kind === 'video' && screenStream.current ? screenStream.current.getVideoTracks()[0] : track,
        localStream.current));
      pc.ontrack = event => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; setStatus('Connecting media…'); };
      pc.onicecandidate = event => { if (event.candidate && active.current && peer.current === pc) send('ice',{ candidate: event.candidate.toJSON() }).catch(e=>setError(errors(e))); };
      pc.onconnectionstatechange = () => {
        if (!active.current || peer.current !== pc) return;
        if (pc.connectionState==='connected') { setError(''); setStatus('Live — secure peer-to-peer connection'); }
        if (pc.connectionState==='failed') setError('Direct connection failed on this network. A TURN relay is required; ask the tutor to switch the booking to Zoom or Teams.');
        if (pc.connectionState==='disconnected') setStatus('Connection interrupted. Trying to reconnect…');
      };

    return pc;
  }, [send]);

  const handleSignal = useCallback(async message => {
    if (!active.current || !peer.current || !booking || message.booking_id!==booking.id || message.sender_id!==recipientId || message.recipient_id!==user?.id) return;
    if (lastSignal.current?.has(message.id)) return;
    const payload = message.payload || {};
    if (!payload.session_id || retiredSessions.current.has(payload.session_id)) return;
    if (payload.target_session && payload.target_session !== sessionId.current) return;
    if (message.kind !== 'ready' && (payload.target_session !== sessionId.current || payload.session_id !== remoteSession.current)) return;
    lastSignal.current?.add(message.id);
    let pc = peer.current;
    try {
      if (message.kind==='ready') {
        if (remoteSession.current !== payload.session_id) {
          if (remoteSession.current) retiredSessions.current.add(remoteSession.current);
          remoteSession.current = payload.session_id;
          pc = createPeer();
        }
        if (!payload.ack) await send('ready', {ack:true});
        if (role==='tutor') await makeOffer();
      } else if (payload.target_session !== sessionId.current || payload.session_id !== remoteSession.current) {
        return;
      } else if (message.kind==='offer' && role==='learner') {
        if (pc.signalingState!=='stable') return;
        await pc.setRemoteDescription({ type:'offer', sdp:message.payload?.sdp });
        await drainIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (!active.current || peer.current !== pc) return;
        await send('answer',{ type:'answer',sdp:pc.localDescription?.sdp });
        setStatus('Connecting to tutor…');
      } else if (message.kind==='answer' && role==='tutor' && pc.signalingState==='have-local-offer') {
        await pc.setRemoteDescription({ type:'answer', sdp:message.payload?.sdp });
        await drainIce();
      } else if (message.kind==='ice' && message.payload?.candidate) {
        const candidate = message.payload.candidate;
        if (pc.remoteDescription) await pc.addIceCandidate(candidate);
        else pendingIce.current.push(candidate);
      } else if (message.kind==='leave') {
        retiredSessions.current.add(remoteSession.current);
        remoteSession.current = null;
        createPeer();
        if (remoteVideo.current) remoteVideo.current.srcObject = null;
        setStatus('The other participant left. Waiting for them to rejoin…');
      }
    } catch (e) { setError('Connection negotiation failed: '+errors(e)); }
  }, [booking,recipientId,user?.id,role,makeOffer,send,drainIce,createPeer]);

  const stop = useCallback(() => {
    active.current = false;
    generation.current += 1;
    joining.current = false;
    clearInterval(pollTimer.current);
    clearInterval(accessTimer.current);
    channel.current && supabase.removeChannel(channel.current);
    channel.current = null;
    screenStream.current?.getTracks().forEach(track => track.stop());
    screenStream.current = null;
    localStream.current?.getTracks().forEach(track => track.stop());
    localStream.current = null;
    peer.current?.close();
    peer.current = null;
    pendingIce.current = [];
    sentOffer.current = false;
    remoteSession.current = null;
    sessionId.current = null;
    retiredSessions.current.clear();
    lastSignal.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    setJoined(false);
    setConnecting(false);
    setMuted(false);
    setCameraOff(false);
    setSharing(false);
    setStatus('You left the classroom');
  }, []);

  useEffect(() => {
    stop();
    setAuthorized(false);
    setBooking(null);
    setError('');
    setStatus('Checking your booking…');
    let cancelled = false;
    const load = async () => {
      if (!user?.id || !bookingId) return;
      const { data: allowed, error: permissionError } = await supabase.rpc('can_join_live_classroom', { booking_key: bookingId });
      if (cancelled) return;
      if (permissionError || !allowed) { setStatus(liveWindowMessage); setError('Access denied or session not ready. The booking must be confirmed and within the joining window. Paid sessions also require verified payment.'); return; }
      const { data, error: bookingError } = await supabase.from('tutor_bookings').select('id,tutor_id,student_id,subject,date,time,duration_hours,status').eq('id',bookingId).single();
      if (cancelled) return;
      if (bookingError || !data || ![data.tutor_id,data.student_id].includes(user.id)) { setError('This booking is unavailable.'); return; }
      setBooking(data);
      setAuthorized(true);
      setStatus('Ready to join your private classroom');
    };
    load().catch(e => { if (!cancelled) setError(errors(e)); });
    return () => { cancelled = true; stop(); };
  }, [bookingId,user?.id,stop]);

  const join = async () => {
    if (!authorized || !booking || joining.current || active.current) return;
    joining.current = true;
    setConnecting(true);
    const attempt = ++generation.current;
    setError('');
    setStatus('Requesting camera and microphone…');
    try {
      const { data: allowed, error: checkError } = await supabase.rpc('can_join_live_classroom', { booking_key: booking.id });
      if (checkError || !allowed) throw new Error(liveWindowMessage);
      if (attempt !== generation.current) return;
      const stream = await getMedia();
      if (attempt !== generation.current) { stream.getTracks().forEach(track => track.stop()); return; }
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      active.current = true;
      lastSignal.current = new Set();
      sessionId.current = crypto.randomUUID();
      remoteSession.current = null;
      signalQueue.current = Promise.resolve();
      createPeer();
      setJoined(true);
      setStatus('Waiting for the other participant…');
      // Serialize SDP and ICE operations; realtime and recovery may deliver duplicates.
      const enqueue = signal => {
        signalQueue.current = signalQueue.current.then(() => {
          if (attempt === generation.current) return handleSignal(signal);
        }).catch(e => { if (active.current) setError(errors(e)); });
        return signalQueue.current;
      };
      let cursor = new Date(Date.now()-60000).toISOString();
      let polling = false;
      let lastReady = 0;
      const recover = async () => {
        if (!active.current || polling || attempt !== generation.current) return;
        polling = true;
        try {
          const { data, error: historyError } = await supabase.from('classroom_signals').select('*')
            .eq('booking_id',booking.id).eq('recipient_id',user.id).gte('created_at',cursor)
            .order('created_at',{ascending:true}).order('id',{ascending:true}).limit(1000);
          if (attempt !== generation.current) return;
          if (historyError) throw historyError;
          for (const signal of data || []) await enqueue(signal);
          if (data?.length) cursor = new Date(new Date(data.at(-1).created_at).getTime()-1000).toISOString();
          if (Date.now()-lastReady > 5000 && peer.current?.connectionState !== 'connected') {
            await send('ready'); lastReady = Date.now();
          }
        } catch (e) { if (active.current) setError('Connection setup interrupted: '+errors(e)+'. Retrying…'); }
        finally { polling = false; }
      };
      // Recovery also works when WebSocket subscription is unavailable.
      pollTimer.current = setInterval(recover, 2000);
      accessTimer.current = setInterval(async () => {
        const { data: stillAllowed, error: accessError } = await supabase.rpc('can_join_live_classroom', {booking_key:booking.id});
        if (attempt !== generation.current) return;
        if (accessError || !stillAllowed) { stop(); setAuthorized(false); setError('Classroom access ended. Refresh your booking before joining again.'); }
      }, 60000);
      await recover();
      if (attempt !== generation.current) return;
      const subscription = supabase.channel('classroom-'+booking.id+'-'+user.id)
        .on('postgres_changes',{ event:'INSERT',schema:'public',table:'classroom_signals',filter:'booking_id=eq.'+booking.id },event=>{ enqueue(event.new); })
        .subscribe(state => {
          if (active.current && state==='SUBSCRIBED') recover();
        });
      channel.current = subscription;
    } catch (e) { if (attempt === generation.current) { stop(); setError(errors(e)); } }
    finally { if (attempt === generation.current) { joining.current = false; setConnecting(false); } }
  };

  const leave = () => { send('leave').catch(()=>{}); stop(); };
  const toggleMic = () => { const track=localStream.current?.getAudioTracks()[0]; if (track) { track.enabled=!track.enabled; setMuted(!track.enabled); } };
  const toggleCamera = () => { const track=localStream.current?.getVideoTracks()[0]; if (track) { track.enabled=!track.enabled; setCameraOff(!track.enabled); } };
  const stopSharing = async () => {
    const stream = screenStream.current;
    screenStream.current = null;
    stream?.getTracks().forEach(track => track.stop());
    const sender = peer.current?.getSenders().find(s=>s.track?.kind==='video');
    const original = localStream.current?.getVideoTracks()[0];
    if (sender && original) await sender.replaceTrack(original).catch(()=>{});
    setSharing(false);
  };
  const shareScreen = async () => {
    if (!peer.current || !localStream.current) return;
    if (screenStream.current) { await stopSharing(); return; }
    if (!navigator.mediaDevices?.getDisplayMedia) { setError('Screen sharing is not available on this device.'); return; }
    try {
      const attempt = generation.current;
      const stream = await navigator.mediaDevices.getDisplayMedia({ video:true });
      if (!active.current || attempt !== generation.current) { stream.getTracks().forEach(track=>track.stop()); return; }
      screenStream.current = stream;
      const track = stream.getVideoTracks()[0];
      const sender = peer.current.getSenders().find(s=>s.track?.kind==='video');
      if (!sender) throw new Error('Video track is unavailable.');
      await sender.replaceTrack(track);
      setSharing(true);
      track.onended = stopSharing;
    } catch (e) { await stopSharing(); setError(errors(e)); }
  };

  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Link to="/bookings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft size={16}/> Back to bookings</Link><h1 className="mt-2 text-2xl font-bold">SmartBridge Live <span className="text-primary">Lite</span></h1><p className="text-sm text-muted-foreground">{booking ? booking.subject+' · '+booking.date+' · '+booking.time+' (SAST)' : 'Private booked tutoring classroom'}</p></div>
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"><ShieldCheck size={16}/> Booking-protected · No recording</span>
    </div>
    <div className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-white">
          <video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-contain" aria-label="Other participant video"/>
          <span className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs">Other participant</span>
        </div>
        <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-xl bg-slate-800 text-white">
          <video ref={localVideo} autoPlay playsInline muted className="h-full w-full object-contain" aria-label="Your camera preview"/>
          <span className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs">You · {role}</span>
        </div>
      </div>
      <p role="status" className="text-center text-sm font-medium">{status}</p>
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      <div className="flex flex-wrap justify-center gap-2">
        {!joined ? <button type="button" disabled={!authorized || connecting} onClick={join} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><Video size={18}/> {connecting ? 'Connecting…' : 'Join classroom'}</button> : <>
          <button type="button" onClick={toggleMic} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">{muted?<MicOff size={18}/>:<Mic size={18}/>} {muted?'Unmute':'Mute'}</button>
          <button type="button" onClick={toggleCamera} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">{cameraOff?<CameraOff size={18}/>:<Camera size={18}/>} {cameraOff?'Camera on':'Camera off'}</button>
          <button type="button" onClick={shareScreen} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"><MonitorUp size={18}/>{sharing?'Stop sharing':'Share screen'}</button>
          <button type="button" onClick={leave} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"><PhoneOff size={18}/> Leave</button>
        </>}
        {joined && <button type="button" onClick={()=>{leave();setStatus('Ready to reconnect');}} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"><RefreshCw size={18}/> Reset</button>}
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 text-sm">
      <div className="rounded-xl border p-4"><h2 className="font-semibold">Safety and privacy</h2><p className="mt-2 text-muted-foreground">Only the booked tutor and learner can enter. Do not share personal contact details or move lessons outside SmartBridge without guardian approval. The call is not recorded. If you feel unsafe, leave immediately and report the incident to SmartBridge support.</p></div>
      <div className="rounded-xl border p-4"><h2 className="font-semibold">Free pilot limitations</h2><p className="mt-2 text-muted-foreground">This uses direct WebRTC with public STUN, without a paid TURN relay. Some school or mobile networks cannot connect. Zoom and Teams remain available through the tutor's existing meeting links.</p></div>
    </div>
  </main>;
}

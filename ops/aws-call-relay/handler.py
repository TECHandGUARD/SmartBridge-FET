"""Short-lived TURN credentials. No AWS credentials, JWTs or relay passwords are logged."""
import base64
import json
import os
import re
import time
import urllib.error
import urllib.request
import uuid

import boto3
from botocore.config import Config

_control = boto3.client('kinesisvideo', config=Config(retries={'max_attempts': 3}, connect_timeout=3, read_timeout=5))
_signaling = {}


def relay_configuration(room=None, actor=None):
    if room and actor:
        name = 'smartbridge-relay-' + room.replace('-', '') + '-' + actor.replace('-', '')
        try:
            channel = _control.describe_signaling_channel(ChannelName=name)['ChannelInfo']['ChannelARN']
        except _control.exceptions.ResourceNotFoundException:
            try:
                channel = _control.create_signaling_channel(ChannelName=name, ChannelType='SINGLE_MASTER', SingleMasterConfiguration={'MessageTtlSeconds': 60}, Tags=[{'Key': 'Application', 'Value': 'SmartBridge-FET'}])['ChannelARN']
            except _control.exceptions.ResourceInUseException:
                channel = _control.describe_signaling_channel(ChannelName=name)['ChannelInfo']['ChannelARN']
    else:
        channel = os.environ['CHANNEL_ARN']
    signaling = _signaling.get(channel)
    if signaling is None:
        endpoints = _control.get_signaling_channel_endpoint(ChannelARN=channel, SingleMasterChannelEndpointConfiguration={'Protocols': ['HTTPS'], 'Role': 'VIEWER'})
        endpoint = next(item['ResourceEndpoint'] for item in endpoints['ResourceEndpointList'] if item['Protocol'] == 'HTTPS')
        signaling = boto3.client('kinesis-video-signaling', endpoint_url=endpoint, config=Config(retries={'max_attempts': 3}, connect_timeout=3, read_timeout=5))
        if len(_signaling) >= 100:
            _signaling.clear()
        _signaling[channel] = signaling
    response = signaling.get_ice_server_config(ChannelARN=channel, ClientId=uuid.uuid4().hex, Service='TURN')
    servers = [{'urls': item['Uris'], 'username': item['Username'], 'credential': item['Password']} for item in response['IceServerList']]
    ttl = min([int(item['Ttl']) for item in response['IceServerList']] or [300])
    return {'iceServers': servers, 'expires_in': min(ttl, 300), 'issued_at': int(time.time())}


def cleanup_channels():
    removed = 0
    import datetime
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)
    for page in _control.get_paginator('list_signaling_channels').paginate(ChannelNameCondition={'ComparisonOperator': 'BEGINS_WITH', 'ComparisonValue': 'smartbridge-relay-'}):
        for channel in page.get('ChannelInfoList', []):
            if channel['CreationTime'] < cutoff:
                _control.delete_signaling_channel(ChannelARN=channel['ChannelARN'], CurrentVersion=channel['Version'])
                removed += 1
                if removed >= 20:
                    return {'removed': removed}
    return {'removed': removed}


def handler(event, _context):
    # IAM-only deployment check. Function URL calls always have AWS-generated requestContext.
    if not event.get('requestContext') and event.get('deployment_check') is True:
        return relay_configuration()
    if not event.get('requestContext') and event.get('source') == 'aws.events':
        return cleanup_channels()
    headers = {key.lower(): value for key, value in event.get('headers', {}).items()}
    origin = headers.get('origin', '')
    allowed = os.environ['APP_ORIGIN']
    common = {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin'}
    if origin == allowed:
        common.update({'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS'})
    def result(status, body):
        return {'statusCode': status, 'headers': common, 'body': json.dumps(body)}
    method = event.get('requestContext', {}).get('http', {}).get('method')
    if method == 'OPTIONS':
        return result(204 if origin == allowed else 403, {})
    if method != 'POST' or (origin and origin != allowed):
        return result(403, {'error': 'Request not allowed'})
    token = headers.get('authorization', '')
    if not re.fullmatch(r'Bearer [A-Za-z0-9._-]{20,8192}', token):
        return result(401, {'error': 'Sign in to join your call'})
    try:
        raw = event.get('body', '')
        if event.get('isBase64Encoded'):
            raw = base64.b64decode(raw).decode()
        if len(raw) > 2048:
            return result(400, {'error': 'Invalid call request'})
        body = json.loads(raw)
        kind, room = body.get('room_kind'), body.get('room_id')
        if kind not in ('meeting', 'classroom') or str(uuid.UUID(room)) != room.lower():
            return result(400, {'error': 'Invalid call request'})
    except (ValueError, TypeError, AttributeError):
        return result(400, {'error': 'Invalid call request'})
    request = urllib.request.Request(os.environ['SUPABASE_URL'] + '/rest/v1/rpc/authorize_call_relay',
        data=json.dumps({'room_kind': kind, 'room_id': room}).encode(), method='POST',
        headers={'Authorization': token, 'apikey': os.environ['SUPABASE_PUBLISHABLE_KEY'], 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=6) as response:
            actor = json.loads(response.read(8192))
            if not isinstance(actor, str):
                return result(403, {'error': 'Call access is unavailable'})
            actor = str(uuid.UUID(actor))
    except urllib.error.HTTPError as error:
        return result(401 if error.code == 401 else 403, {'error': 'Call access or request limit denied'})
    except (urllib.error.URLError, TimeoutError, ValueError):
        return result(503, {'error': 'Call authorization is temporarily unavailable'})
    try:
        return result(200, relay_configuration(room, actor))
    except Exception:
        # Bounded public error, never a provider payload or credentials.
        return result(503, {'error': 'The call relay is temporarily unavailable'})

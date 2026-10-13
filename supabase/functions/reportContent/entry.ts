import {serve} from 'https://deno.land/std@0.177.0/http/server.ts';
import {studyRoomHandler} from '../../shared/study-room.ts';
serve(studyRoomHandler('reports','report-content'));

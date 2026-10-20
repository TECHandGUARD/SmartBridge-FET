"""Authorization boundary tests; provider calls and HTTP are isolated."""
import importlib.util
import io
import json
import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

sys.modules['boto3'] = types.SimpleNamespace(client=MagicMock())
sys.modules['botocore.config'] = types.SimpleNamespace(Config=MagicMock())
spec = importlib.util.spec_from_file_location('relay', 'ops/aws-call-relay/handler.py')
relay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(relay)

class RelayTests(unittest.TestCase):
    def setUp(self):
        os.environ.update(APP_ORIGIN='https://app.example.test', SUPABASE_URL='https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY='sb_publishable_test')
        self.event = {'requestContext': {'http': {'method': 'POST'}}, 'headers': {'origin': 'https://app.example.test', 'authorization': 'Bearer ' + 'a' * 30}, 'body': json.dumps({'room_kind': 'meeting', 'room_id': '00000000-0000-4000-8000-000000000001'})}

    def test_url_cannot_spoof_iam_deployment_check(self):
        self.event['deployment_check'] = True
        self.event['headers'].pop('authorization')
        with patch.object(relay, 'relay_configuration') as issue:
            self.assertEqual(relay.handler(self.event, None)['statusCode'], 401)
            issue.assert_not_called()

    def test_unapproved_origin_and_invalid_room_cannot_issue(self):
        with patch.object(relay, 'relay_configuration') as issue:
            self.event['headers']['origin'] = 'https://other.example.test'
            self.assertEqual(relay.handler(self.event, None)['statusCode'], 403)
            self.event['headers']['origin'] = os.environ['APP_ORIGIN']
            self.event['body'] = '{}'
            self.assertEqual(relay.handler(self.event, None)['statusCode'], 400)
            issue.assert_not_called()

    def test_denial_cannot_issue_credentials(self):
        with patch.object(relay.urllib.request, 'urlopen', return_value=io.BytesIO(b'false')), patch.object(relay, 'relay_configuration') as issue:
            self.assertEqual(relay.handler(self.event, None)['statusCode'], 403)
            issue.assert_not_called()

    def test_authorized_identity_comes_from_database(self):
        actor = '00000000-0000-4000-8000-000000000002'
        with patch.object(relay.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(actor).encode())), patch.object(relay, 'relay_configuration', return_value={'iceServers': [], 'expires_in': 300}) as issue:
            response = relay.handler(self.event, None)
            self.assertEqual(response['statusCode'], 200)
            self.assertEqual(response['headers']['Cache-Control'], 'no-store')
            issue.assert_called_once_with('00000000-0000-4000-8000-000000000001', actor)

    def test_room_identity_is_canonical_before_issuance(self):
        room = 'abcdefab-1234-4000-8000-000000000001'
        actor = '00000000-0000-4000-8000-000000000002'
        self.event['body'] = json.dumps({'room_kind': 'meeting', 'room_id': room.upper()})
        with patch.object(relay.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(actor).encode())) as authorize, patch.object(relay, 'relay_configuration', return_value={}) as issue:
            self.assertEqual(relay.handler(self.event, None)['statusCode'], 200)
            self.assertEqual(json.loads(authorize.call_args.args[0].data)['room_id'], room)
            issue.assert_called_once_with(room, actor)

    def test_provider_failure_does_not_leak_payload(self):
        actor = '00000000-0000-4000-8000-000000000002'
        with patch.object(relay.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(actor).encode())), patch.object(relay, 'relay_configuration', side_effect=Exception('SECRET-PROVIDER-PAYLOAD')):
            response = relay.handler(self.event, None)
            self.assertEqual(response['statusCode'], 503)
            self.assertNotIn('SECRET', response['body'])

if __name__ == '__main__':
    unittest.main()

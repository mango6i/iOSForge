import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('private_publisher', Path(__file__).resolve().parents[1] / '.github/scripts/publish_outputs.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
cleanup_spec = importlib.util.spec_from_file_location('private_cleanup', Path(__file__).resolve().parents[1] / '.github/scripts/cleanup.py')
cleanup = importlib.util.module_from_spec(cleanup_spec)
cleanup_spec.loader.exec_module(cleanup)


class PrivatePublisherTests(unittest.TestCase):
    def test_cleanup_never_deletes_or_modifies_public_repository(self):
        requests = []
        def respond(request, **kwargs):
            requests.append(request)
            return io.BytesIO(json.dumps(dict(private=False, full_name='owner/build')).encode())
        with patch.object(cleanup, 'urlopen', respond):
            api = cleanup.GitHubApi('owner/build', 'fixture-only-token')
            for method, path in [('DELETE', '/actions/runs/1'), ('DELETE', '/issues/comments/1'), ('PATCH', '/git/refs/heads/main'), ('POST', '/git/commits')]:
                with self.assertRaisesRegex(RuntimeError, 'PRIVATE'):
                    api.request(method, path)
        self.assertEqual([r.method for r in requests], ['GET'] * 4)

    def test_no_binary_written_to_public_unknown_or_different_repository(self):
        for repository in [dict(private=False, full_name='owner/build'), dict(full_name='owner/build'), dict(private=True, full_name='owner/other')]:
            requests = []
            def respond(request, **kwargs):
                requests.append(request)
                return io.BytesIO(json.dumps(repository).encode())
            with self.subTest(repository=repository), patch.object(publisher, 'urlopen', respond):
                with self.assertRaisesRegex(RuntimeError, 'PRIVATE'):
                    publisher.GitHubApi('owner/build', 'fixture-only-token').request('POST', '/git/blobs', {'content': 'fixture'})
            self.assertEqual([r.method for r in requests], ['GET'])
            self.assertIsNone(requests[0].data)

    def test_private_write_is_rechecked(self):
        requests = []
        def respond(request, **kwargs):
            requests.append(request)
            body = dict(private=True, full_name='owner/build') if request.method == 'GET' else dict(sha='fixture')
            return io.BytesIO(json.dumps(body).encode())
        with patch.object(publisher, 'urlopen', respond):
            api = publisher.GitHubApi('owner/build', 'fixture-only-token')
            self.assertEqual(api.request('POST', '/git/blobs', {'content': 'fixture'})['sha'], 'fixture')
        self.assertEqual([r.method for r in requests], ['GET', 'POST'])


if __name__ == '__main__':
    unittest.main()

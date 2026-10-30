import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('notification_cleanup', Path(__file__).resolve().parents[1] / '.github/scripts/cleanup.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
BOT = {'login': 'github-actions[bot]'}


class Api:
    def __init__(self, body=None, comments=None, state='open', user=None):
        self.issue = dict(number=1, title='MyApp 创建成功', body=body if body is not None else c.notification_hub_body(), user=user or BOT, state=state, comments=len(comments or []))
        self.comments = comments or []
        self.calls = []

    def request(self, method, path, payload=None, **kwargs):
        self.calls.append((method, path, payload))
        if method == 'GET':
            if path.startswith('/issues?'):
                return [copy.deepcopy(self.issue)]
            if path.startswith('/issues/1/comments?'):
                return copy.deepcopy(self.comments[:1] if 'per_page=1' in path and 'per_page=100' not in path else self.comments)
            if path == '/issues/1':
                self.issue['comments'] = len(self.comments)
                return copy.deepcopy(self.issue)
            if path.startswith('/actions/runs/'):
                return None
            if path.startswith('/issues/comments/'):
                return copy.deepcopy(next(x for x in self.comments if x['id'] == int(path.rsplit('/', 1)[1])))
        if method == 'PATCH' and path == '/issues/1':
            self.issue.update(payload)
            return copy.deepcopy(self.issue)
        if method == 'DELETE' and path.startswith('/issues/comments/'):
            self.comments = [x for x in self.comments if x['id'] != int(path.rsplit('/', 1)[1])]
            return None
        raise AssertionError((method, path, payload))


class NotificationCleanupTests(unittest.TestCase):
    def test_empty_bot_container_closes_and_stale_success_title_is_removed(self):
        api = Api()
        self.assertTrue(c.close_empty_notification_issue(api, 1))
        self.assertEqual(api.issue['state'], 'closed')
        self.assertNotIn('创建成功', api.issue['title'])
        self.assertEqual(api.issue['state_reason'], 'completed')

    def test_human_comments_and_active_results_are_preserved(self):
        for api in [Api(comments=[dict(id=3, user={'login': 'owner'}, body='Keep this discussion')]), Api(body=c.NOTIFICATION_MARKER + '\n<!-- iosforge-run:55 -->\nActive result'), Api(user={'login': 'owner'})]:
            with self.subTest(issue=api.issue):
                self.assertFalse(c.close_empty_notification_issue(api, 1))
                self.assertEqual(api.issue['state'], 'open')

    def test_deleted_build_result_is_scrubbed_then_container_is_closed(self):
        api = Api(body=c.NOTIFICATION_MARKER + '\n<!-- iosforge-run:55 -->\nMyApp success')
        with patch.object(c, 'daily_cleanup_log', return_value=({}, 'fixture')), patch.object(c, 'save_cleanup_log'):
            c.prune_build_notifications(api, 'main', {55})
        self.assertEqual(api.issue['body'], c.notification_hub_body())
        self.assertEqual(api.issue['state'], 'closed')

    def test_new_notification_has_actual_result_and_assigns_repository_owner(self):
        calls = []
        class Create:
            def request(self, method, path, payload=None):
                calls.append((method, path, payload))
                if method == 'GET':
                    return []
                return {'number': 7}
        self.assertEqual(c.notification_issue(Create(), 'MyApp 创建成功', '@owner\nActual result', 'owner'), (7, True))
        payload = calls[-1][2]
        self.assertEqual(payload['assignees'], ['owner'])
        self.assertEqual(payload['title'], 'MyApp 创建成功')
        self.assertIn('@owner', payload['body'])

    def test_closed_container_reopens_with_new_title_before_result_comment(self):
        api = Api(state='closed')
        self.assertEqual(c.notification_issue(api, 'NewApp 创建成功', '@owner', 'owner'), (1, False))
        self.assertEqual(api.issue['title'], 'NewApp 创建成功')
        self.assertEqual(api.issue['assignees'], ['owner'])


if __name__ == '__main__':
    unittest.main()

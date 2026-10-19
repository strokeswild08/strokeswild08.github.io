import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.tracker import Tracker, extract_text, diff_rows


def test_selector_extracts_only_relevant_normalized_text():
    html = '<nav>Ignore</nav><main><h1>Release</h1><p> New   version </p><script>evil()</script><style>css</style></main>'
    assert extract_text(html, 'main') == 'Release\nNew version'
    assert extract_text(html, 'main p') == 'New version'


@pytest.mark.parametrize('html,selector', [('<main/>', 'main'), ('<main>Hello</main>', '#missing'), ('<main>Hello</main>', '[')])
def test_bad_or_empty_selectors_fail(html, selector):
    with pytest.raises(ValueError):
        extract_text(html, selector)


def test_hash_deduplication_failure_preservation_and_restart(tmp_path):
    content = ['<main>First</main>']
    path = tmp_path / 'history.sqlite3'
    tracker = Tracker(path, lambda _: content[0])
    watch = tracker.create('Notes', 'https://example.com', 'main')
    assert tracker.check(watch)['status'] == 'baseline'
    assert tracker.check(watch)['status'] == 'unchanged'
    assert len(tracker.history(watch)) == 1
    content[0] = '<main>Second</main>'
    assert tracker.check(watch)['status'] == 'changed'
    assert len(tracker.history(watch)) == 2
    content[0] = '<div>Removed selector</div>'
    with pytest.raises(ValueError): tracker.check(watch)
    assert tracker.history(watch)[0]['text'] == 'Second'
    assert tracker.list()[0]['status'] == 'error'
    restarted = Tracker(path, lambda _: '<main>Second</main>')
    assert restarted.check(watch)['status'] == 'unchanged'
    assert restarted.list()[0]['last_error'] is None


def test_snapshot_retention(tmp_path):
    state = [0]
    tracker = Tracker(tmp_path/'test.db', lambda _: f'<main>{state[0]}</main>')
    id = tracker.create('Test', 'https://example.com', 'main')
    for n in range(35):
        state[0] = n
        tracker.check(id)
    history = tracker.history(id)
    assert len(history) == 30
    assert history[0]['text'] == '34'
    assert history[-1]['text'] == '5'


def test_diff_direction_and_text_limits():
    assert diff_rows('same\nold', 'same\nnew') == [{'type':'same','text':'same'}, {'type':'removed','text':'old'}, {'type':'added','text':'new'}]
    with pytest.raises(ValueError): extract_text('<main>'+'x'*50001+'</main>', 'main')


def test_api_lifecycle_diff_scoping_and_origin(tmp_path):
    html = ['<main>One</main>']
    app = create_app(tmp_path/'api.sqlite3', lambda _: html[0])
    with TestClient(app) as client:
        assert client.get('/api/meta').json()['mode'] == 'live'
        assert client.get('/').status_code == 200
        payload = {'name':'Test', 'url':'https://example.com', 'selector':'main'}
        r = client.post('/api/watches', json=payload)
        assert r.status_code == 201
        id = r.json()['id']
        assert client.post(f'/api/watches/{id}/check').json()['status'] == 'baseline'
        html[0] = '<main>Two</main>'
        assert client.post(f'/api/watches/{id}/check').json()['status'] == 'changed'
        history = client.get(f'/api/watches/{id}/history').json()
        after, before = [s['id'] for s in history]
        diff = client.get(f'/api/watches/{id}/diff?before={before}&after={after}').json()
        assert diff[0]['type'] == 'removed' and diff[1]['type'] == 'added'
        other = client.post('/api/watches', json={**payload,'name':'Other'}).json()['id']
        assert client.get(f'/api/watches/{other}/diff?before={before}&after={after}').status_code == 404
        assert client.post('/api/watches/999/check').status_code == 404
        assert client.get('/api/watches/999/history').status_code == 404
        assert client.post('/api/watches', json={**payload, 'selector':'['}).status_code == 400
        assert client.post('/api/watches', json=payload, headers={'Origin':'https://untrusted.example'}).status_code == 403
        assert client.post('/api/watches', json=payload, headers={'Origin':'http://testserver'}).status_code == 201
        assert client.post('/api/watches', json={**payload,'name':'   '}).status_code == 400


def test_fetch_failure_keeps_snapshot(tmp_path):
    def fail(_): raise OSError('Unavailable')
    tracker = Tracker(tmp_path/'failed.db', lambda _: '<main>Keep me</main>')
    id = tracker.create('Test','https://example.com','main')
    tracker.check(id)
    tracker.fetch = fail
    with pytest.raises(ValueError): tracker.check(id)
    assert tracker.history(id)[0]['text'] == 'Keep me'

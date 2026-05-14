"""Team Task Manager - Backend API tests (pytest)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://task-manager-pro-84.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@demo.com", "password": "Admin@123"}
MEMBER = {"email": "member@demo.com", "password": "Member@123"}


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def member_token():
    r = requests.post(f"{API}/auth/login", json=MEMBER, timeout=30)
    assert r.status_code == 200, f"member login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def admin_h(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


# ---------- Auth ----------
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "admin"
        assert body["user"]["email"] == "admin@demo.com"
        assert isinstance(body["token"], str) and len(body["token"]) > 20

    def test_login_member(self):
        r = requests.post(f"{API}/auth/login", json=MEMBER, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "member"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@demo.com", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_admin(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=admin_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == "admin@demo.com"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_signup_new_user(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/signup", json={
            "name": "TEST User", "email": email, "password": "Passw0rd!"
        }, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["email"] == email
        assert body["user"]["role"] == "member"
        assert "token" in body

    def test_signup_duplicate(self):
        r = requests.post(f"{API}/auth/signup", json={
            "name": "dup", "email": "admin@demo.com", "password": "Passw0rd!"
        }, timeout=15)
        assert r.status_code == 400


# ---------- Projects ----------
class TestProjects:
    def test_list_projects_admin(self, admin_token):
        r = requests.get(f"{API}/projects", headers=admin_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_member_cannot_create_project(self, member_token):
        r = requests.post(
            f"{API}/projects",
            headers=admin_h(member_token),
            json={"title": "TEST_should_fail"},
            timeout=15,
        )
        assert r.status_code == 403

    def test_admin_create_update_delete_project(self, admin_token, member_token):
        # CREATE
        # get member id
        me_m = requests.get(f"{API}/auth/me", headers=admin_h(member_token), timeout=15).json()
        member_id = me_m["id"]
        r = requests.post(
            f"{API}/projects",
            headers=admin_h(admin_token),
            json={"title": "TEST_proj", "description": "desc", "members": [member_id]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        proj = r.json()
        assert proj["title"] == "TEST_proj"
        assert member_id in proj["members"]
        pid = proj["id"]

        # GET
        g = requests.get(f"{API}/projects/{pid}", headers=admin_h(admin_token), timeout=15)
        assert g.status_code == 200
        assert g.json()["id"] == pid

        # Member sees this project (assigned)
        ml = requests.get(f"{API}/projects", headers=admin_h(member_token), timeout=15)
        assert ml.status_code == 200
        assert any(p["id"] == pid for p in ml.json())

        # UPDATE
        u = requests.put(
            f"{API}/projects/{pid}",
            headers=admin_h(admin_token),
            json={"title": "TEST_proj_updated"},
            timeout=15,
        )
        assert u.status_code == 200
        assert u.json()["title"] == "TEST_proj_updated"

        # Verify persistence
        g2 = requests.get(f"{API}/projects/{pid}", headers=admin_h(admin_token), timeout=15)
        assert g2.json()["title"] == "TEST_proj_updated"

        # DELETE
        d = requests.delete(f"{API}/projects/{pid}", headers=admin_h(admin_token), timeout=15)
        assert d.status_code == 200

        g3 = requests.get(f"{API}/projects/{pid}", headers=admin_h(admin_token), timeout=15)
        assert g3.status_code == 404


# ---------- Tasks ----------
class TestTasks:
    @pytest.fixture(scope="class")
    def project(self, admin_token, member_token):
        me_m = requests.get(f"{API}/auth/me", headers=admin_h(member_token), timeout=15).json()
        member_id = me_m["id"]
        r = requests.post(
            f"{API}/projects",
            headers=admin_h(admin_token),
            json={"title": "TEST_task_proj", "members": [member_id]},
            timeout=15,
        )
        assert r.status_code == 200
        pid = r.json()["id"]
        yield {"id": pid, "member_id": member_id}
        requests.delete(f"{API}/projects/{pid}", headers=admin_h(admin_token), timeout=15)

    def test_admin_create_task(self, admin_token, project):
        r = requests.post(
            f"{API}/tasks",
            headers=admin_h(admin_token),
            json={
                "title": "TEST_task",
                "project_id": project["id"],
                "priority": "high",
                "status": "todo",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == "TEST_task"
        assert body["status"] == "todo"
        project["task_id"] = body["id"]

    def test_member_cannot_create_task(self, member_token, project):
        r = requests.post(
            f"{API}/tasks",
            headers=admin_h(member_token),
            json={"title": "TEST_x", "project_id": project["id"]},
            timeout=15,
        )
        assert r.status_code == 403

    def test_member_can_update_status(self, member_token, project):
        tid = project["task_id"]
        r = requests.patch(
            f"{API}/tasks/{tid}/status",
            headers=admin_h(member_token),
            json={"status": "in_progress"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"

    def test_member_cannot_edit_task(self, member_token, project):
        tid = project["task_id"]
        r = requests.put(
            f"{API}/tasks/{tid}",
            headers=admin_h(member_token),
            json={"title": "hack"},
            timeout=15,
        )
        assert r.status_code == 403

    def test_admin_update_task(self, admin_token, project):
        tid = project["task_id"]
        r = requests.put(
            f"{API}/tasks/{tid}",
            headers=admin_h(admin_token),
            json={"title": "TEST_task_renamed", "priority": "low"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_task_renamed"
        assert r.json()["priority"] == "low"

    def test_list_tasks_by_project(self, admin_token, project):
        r = requests.get(
            f"{API}/tasks",
            headers=admin_h(admin_token),
            params={"project_id": project["id"]},
            timeout=15,
        )
        assert r.status_code == 200
        assert any(t["id"] == project["task_id"] for t in r.json())

    def test_member_cannot_delete(self, member_token, project):
        r = requests.delete(f"{API}/tasks/{project['task_id']}", headers=admin_h(member_token), timeout=15)
        assert r.status_code == 403

    def test_admin_delete_task(self, admin_token, project):
        r = requests.delete(f"{API}/tasks/{project['task_id']}", headers=admin_h(admin_token), timeout=15)
        assert r.status_code == 200


# ---------- Users ----------
class TestUsers:
    def test_list_users(self, admin_token):
        r = requests.get(f"{API}/users", headers=admin_h(admin_token), timeout=15)
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert "admin@demo.com" in emails
        assert "member@demo.com" in emails

    def test_member_cannot_change_role(self, admin_token, member_token):
        users = requests.get(f"{API}/users", headers=admin_h(admin_token), timeout=15).json()
        target = next(u for u in users if u["email"] == "member@demo.com")
        r = requests.patch(
            f"{API}/users/{target['id']}/role",
            headers=admin_h(member_token),
            json={"role": "admin"},
            timeout=15,
        )
        assert r.status_code == 403

    def test_admin_can_change_role(self, admin_token):
        # create a temp user via signup, then toggle role
        email = f"test_role_{uuid.uuid4().hex[:6]}@example.com"
        sr = requests.post(f"{API}/auth/signup", json={
            "name": "TEST role", "email": email, "password": "Passw0rd!"
        }, timeout=15)
        uid = sr.json()["user"]["id"]
        r = requests.patch(
            f"{API}/users/{uid}/role",
            headers=admin_h(admin_token),
            json={"role": "admin"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------- Dashboard ----------
class TestDashboard:
    def test_stats(self, admin_token):
        r = requests.get(f"{API}/dashboard/stats", headers=admin_h(admin_token), timeout=15)
        assert r.status_code == 200
        body = r.json()
        for key in ["total_tasks", "completed_tasks", "overdue_tasks", "status_breakdown", "productivity"]:
            assert key in body
        assert isinstance(body["status_breakdown"], list)
        assert isinstance(body["productivity"], list)
        assert len(body["productivity"]) == 7

    def test_upcoming(self, admin_token):
        r = requests.get(f"{API}/dashboard/upcoming", headers=admin_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_recent(self, admin_token):
        r = requests.get(f"{API}/dashboard/recent", headers=admin_h(admin_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Comments (new in iteration 2) ----------
class TestComments:
    @pytest.fixture(scope="class")
    def task_ctx(self, admin_token, member_token):
        me_m = requests.get(f"{API}/auth/me", headers=admin_h(member_token), timeout=15).json()
        member_id = me_m["id"]
        # project with member
        pr = requests.post(
            f"{API}/projects",
            headers=admin_h(admin_token),
            json={"title": "TEST_comments_proj", "members": [member_id]},
            timeout=15,
        )
        assert pr.status_code == 200, pr.text
        pid = pr.json()["id"]
        # second project WITHOUT member (for forbidden check)
        pr2 = requests.post(
            f"{API}/projects",
            headers=admin_h(admin_token),
            json={"title": "TEST_comments_proj_private", "members": []},
            timeout=15,
        )
        assert pr2.status_code == 200
        pid2 = pr2.json()["id"]
        # task in project 1 (member has access)
        tr = requests.post(
            f"{API}/tasks",
            headers=admin_h(admin_token),
            json={"title": "TEST_c_task", "project_id": pid},
            timeout=15,
        )
        assert tr.status_code == 200
        tid = tr.json()["id"]
        # task in project 2 (member has NO access)
        tr2 = requests.post(
            f"{API}/tasks",
            headers=admin_h(admin_token),
            json={"title": "TEST_c_task_private", "project_id": pid2},
            timeout=15,
        )
        assert tr2.status_code == 200
        tid_private = tr2.json()["id"]
        yield {"pid": pid, "tid": tid, "tid_private": tid_private, "member_id": member_id}
        # cleanup
        requests.delete(f"{API}/projects/{pid}", headers=admin_h(admin_token), timeout=15)
        requests.delete(f"{API}/projects/{pid2}", headers=admin_h(admin_token), timeout=15)

    def test_list_comments_requires_auth(self, task_ctx):
        r = requests.get(f"{API}/tasks/{task_ctx['tid']}/comments", timeout=15)
        assert r.status_code == 401

    def test_list_comments_invalid_task(self, admin_token):
        r = requests.get(
            f"{API}/tasks/does-not-exist/comments",
            headers=admin_h(admin_token),
            timeout=15,
        )
        assert r.status_code == 404

    def test_member_cannot_access_non_member_task_comments(self, member_token, task_ctx):
        r = requests.get(
            f"{API}/tasks/{task_ctx['tid_private']}/comments",
            headers=admin_h(member_token),
            timeout=15,
        )
        assert r.status_code == 403

    def test_admin_create_comment(self, admin_token, task_ctx):
        r = requests.post(
            f"{API}/tasks/{task_ctx['tid']}/comments",
            headers=admin_h(admin_token),
            json={"body": "hello from admin"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["body"] == "hello from admin"
        assert body["user_name"] == "Demo Admin"
        assert body["task_id"] == task_ctx["tid"]
        assert "id" in body
        task_ctx["admin_comment_id"] = body["id"]

    def test_member_create_comment(self, member_token, task_ctx):
        r = requests.post(
            f"{API}/tasks/{task_ctx['tid']}/comments",
            headers=admin_h(member_token),
            json={"body": "hi from member"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user_name"] == "Demo Member"
        task_ctx["member_comment_id"] = body["id"]

    def test_list_comments_ordered(self, admin_token, task_ctx):
        r = requests.get(
            f"{API}/tasks/{task_ctx['tid']}/comments",
            headers=admin_h(admin_token),
            timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 2
        bodies = [c["body"] for c in data]
        assert "hello from admin" in bodies
        assert "hi from member" in bodies

    def test_member_cannot_delete_admin_comment(self, member_token, task_ctx):
        r = requests.delete(
            f"{API}/comments/{task_ctx['admin_comment_id']}",
            headers=admin_h(member_token),
            timeout=15,
        )
        assert r.status_code == 403

    def test_member_can_delete_own_comment(self, member_token, task_ctx):
        r = requests.delete(
            f"{API}/comments/{task_ctx['member_comment_id']}",
            headers=admin_h(member_token),
            timeout=15,
        )
        assert r.status_code == 200

    def test_admin_can_delete_any_comment(self, admin_token, task_ctx):
        r = requests.delete(
            f"{API}/comments/{task_ctx['admin_comment_id']}",
            headers=admin_h(admin_token),
            timeout=15,
        )
        assert r.status_code == 200
        # verify gone: list again, should not contain
        l = requests.get(
            f"{API}/tasks/{task_ctx['tid']}/comments",
            headers=admin_h(admin_token),
            timeout=15,
        )
        assert l.status_code == 200
        ids = [c["id"] for c in l.json()]
        assert task_ctx["admin_comment_id"] not in ids

    def test_delete_nonexistent_comment(self, admin_token):
        r = requests.delete(f"{API}/comments/nope-{uuid.uuid4().hex}", headers=admin_h(admin_token), timeout=15)
        assert r.status_code == 404

    def test_empty_body_rejected(self, admin_token, task_ctx):
        r = requests.post(
            f"{API}/tasks/{task_ctx['tid']}/comments",
            headers=admin_h(admin_token),
            json={"body": ""},
            timeout=15,
        )
        assert r.status_code == 422

const LS_SESSION = "trello_session";
const LS_TOKEN = "trello_token";
const LS_ORG_ID = "trello_org_id";

const STATUS = {
    UP_NEXT: "up next",
    IN_PROGRESS: "in progress",
    DONE: "done",
};

const api = (path, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    const token = localStorage.getItem(LS_TOKEN);
    if (token) headers.token = token;
    return fetch(path, { ...options, headers }).then(async (res) => {
        const text = await res.text();
        let data = text;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            /* plain text */
        }
        if (!res.ok) {
            const err = new Error(
                typeof data === "string" ? data : data?.message || res.statusText
            );
            err.status = res.status;
            err.body = data;
            throw err;
        }
        return data;
    });
};

function getSession() {
    try {
        return JSON.parse(localStorage.getItem(LS_SESSION) || "null");
    } catch {
        return null;
    }
}

function setSession(session) {
    localStorage.setItem(LS_SESSION, JSON.stringify(session));
}

function clearAuth() {
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_ORG_ID);
}

function showView(name) {
    document.querySelectorAll(".view").forEach((el) => {
        el.classList.toggle("active", el.dataset.view === name);
    });
    const boardBar = document.getElementById("header-board");
    const orgBar = document.getElementById("header-org");
    const dashBack = document.getElementById("btn-back-dashboard");
    if (boardBar) boardBar.classList.toggle("hidden", name !== "board");
    if (orgBar) orgBar.classList.toggle("hidden", name !== "org");
    if (dashBack) dashBack.classList.toggle("hidden", !["board", "org"].includes(name));
}

function setMessage(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("error", !!isError);
}

async function ensureOrgToken(orgId) {
    const session = getSession();
    if (!session?.email) throw new Error("Not signed in");
    const res = await api("/org-login", {
        method: "POST",
        body: JSON.stringify({ email: session.email, orgid: orgId }),
    });
    localStorage.setItem(LS_TOKEN, res.token);
    localStorage.setItem(LS_ORG_ID, orgId);
}

function fillOrgSelect(selectEl, orgs, selectedId) {
    selectEl.innerHTML = "";
    (orgs || []).forEach((org) => {
        const opt = document.createElement("option");
        opt.value = org.id;
        opt.textContent = org.name;
        selectEl.appendChild(opt);
    });
    if (selectedId && orgs?.some((o) => o.id === selectedId)) {
        selectEl.value = selectedId;
    }
}

async function loadDashboardOrgs() {
    const session = getSession();
    const select = document.getElementById("dashboard-org");
    if (!session?.orgs?.length) {
        showView("onboarding");
        return;
    }
    const savedOrg = localStorage.getItem(LS_ORG_ID);
    fillOrgSelect(select, session.orgs, savedOrg || session.orgs[0].id);
    await ensureOrgToken(select.value);
}

function init() {
    const msgSignin = document.getElementById("msg-signin");
    const msgSignup = document.getElementById("msg-signup");
    const msgOnboard = document.getElementById("msg-onboard");
    const msgBoard = document.getElementById("msg-board");
    const msgOrg = document.getElementById("msg-org");

    document.getElementById("tab-signin")?.addEventListener("click", () => {
        document.getElementById("tab-signin")?.classList.add("active");
        document.getElementById("tab-signup")?.classList.remove("active");
        document.getElementById("form-signin")?.classList.remove("hidden");
        document.getElementById("form-signup")?.classList.add("hidden");
    });
    document.getElementById("tab-signup")?.addEventListener("click", () => {
        document.getElementById("tab-signup")?.classList.add("active");
        document.getElementById("tab-signin")?.classList.remove("active");
        document.getElementById("form-signup")?.classList.remove("hidden");
        document.getElementById("form-signin")?.classList.add("hidden");
    });

    document.getElementById("form-signin")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        setMessage(msgSignin, "");
        const email = document.getElementById("signin-email").value.trim();
        const password = document.getElementById("signin-password").value;
        try {
            const res = await api("/signin", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            setSession({
                email,
                orgs: res.org || [],
                orglength: res.orglength ?? 0,
            });
            localStorage.removeItem(LS_TOKEN);
            localStorage.removeItem(LS_ORG_ID);
            if (!res.org || res.orglength === 0) {
                showView("onboarding");
            } else {
                showView("dashboard");
                await loadDashboardOrgs();
            }
        } catch (err) {
            setMessage(msgSignin, err.message || "Sign in failed", true);
        }
    });

    document.getElementById("form-signup")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        setMessage(msgSignup, "");
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;
        try {
            await api("/signup", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            setMessage(msgSignup, "Account created. Sign in.");
            document.getElementById("tab-signin")?.click();
            document.getElementById("signin-email").value = email;
        } catch (err) {
            setMessage(msgSignup, err.message || "Signup failed", true);
        }
    });

    document.getElementById("form-onboard")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        setMessage(msgOnboard, "");
        const session = getSession();
        const orgname = document.getElementById("onboard-name").value.trim();
        const description = document.getElementById("onboard-desc").value.trim();
        if (!session?.email) {
            showView("auth");
            return;
        }
        try {
            const created = await api("/new-org", {
                method: "POST",
                body: JSON.stringify({
                    email: session.email,
                    orgname,
                    description,
                }),
            });
            const prev = session.orgs || [];
            const orgs = [...prev, created.org].filter(Boolean);
            setSession({
                ...session,
                orgs,
                orglength: orgs.length,
            });
            showView("dashboard");
            await loadDashboardOrgs();
        } catch (err) {
            setMessage(msgOnboard, err.message || "Could not create org", true);
        }
    });

    document.getElementById("dashboard-org")?.addEventListener("change", async (e) => {
        try {
            await ensureOrgToken(e.target.value);
            setMessage(document.getElementById("msg-dashboard"), "");
        } catch (err) {
            setMessage(document.getElementById("msg-dashboard"), err.message, true);
        }
    });

    document.getElementById("btn-open-board")?.addEventListener("click", async () => {
        const select = document.getElementById("dashboard-org");
        try {
            await ensureOrgToken(select.value);
            showView("board");
            await loadTasks();
        } catch (err) {
            setMessage(document.getElementById("msg-dashboard"), err.message, true);
        }
    });

    document.getElementById("btn-open-org")?.addEventListener("click", async () => {
        const select = document.getElementById("dashboard-org");
        try {
            await ensureOrgToken(select.value);
            showView("org");
            await loadOrgMembers();
        } catch (err) {
            setMessage(document.getElementById("msg-dashboard"), err.message, true);
        }
    });

    document.getElementById("btn-signout-header")?.addEventListener("click", () => {
        clearAuth();
        showView("auth");
    });

    document.getElementById("card-task-board")?.addEventListener("click", () => {
        document.getElementById("btn-open-board")?.click();
    });

    document.getElementById("header-board")?.addEventListener("click", () => {
        document.getElementById("btn-create-task")?.click();
    });

    document.getElementById("header-org")?.addEventListener("click", () => {
        document.getElementById("btn-open-org")?.click();
    });

    document.getElementById("btn-back-dashboard")?.addEventListener("click", () => {
        showView("dashboard");
    });

    document.getElementById("btn-create-task")?.addEventListener("click", () => {
        document.getElementById("create-task-panel")?.classList.toggle("hidden");
    });

    document.getElementById("form-new-task")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        setMessage(msgBoard, "");
        const title = document.getElementById("task-title").value.trim();
        const discription = document.getElementById("task-desc").value.trim();
        try {
            await api("/new-task", {
                method: "POST",
                body: JSON.stringify({
                    title,
                    discription,
                    status: STATUS.UP_NEXT,
                }),
            });
            document.getElementById("task-title").value = "";
            document.getElementById("task-desc").value = "";
            await loadTasks();
        } catch (err) {
            setMessage(msgBoard, err.message || "Could not create task", true);
        }
    });

    document.getElementById("form-invite")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        setMessage(msgOrg, "");
        const memberemail = document.getElementById("invite-email").value.trim();
        const orgid = localStorage.getItem(LS_ORG_ID);
        try {
            await api("/added-member", {
                method: "POST",
                body: JSON.stringify({ memberemail, orgid }),
            });
            document.getElementById("invite-email").value = "";
            await loadOrgMembers();
        } catch (err) {
            setMessage(msgOrg, err.message || "Invite failed", true);
        }
    });

    const session = getSession();
    if (session?.email) {
        const hasOrgs = session.orgs && session.orgs.length > 0;
        if (!hasOrgs) {
            showView("onboarding");
        } else {
            showView("dashboard");
            loadDashboardOrgs().catch(() => showView("auth"));
        }
    } else {
        showView("auth");
    }
}

async function loadTasks() {
    const cols = {
        [STATUS.UP_NEXT]: document.getElementById("col-up-next"),
        [STATUS.IN_PROGRESS]: document.getElementById("col-in-progress"),
        [STATUS.DONE]: document.getElementById("col-done"),
    };
    Object.values(cols).forEach((el) => {
        if (el) el.querySelectorAll(".task-card").forEach((n) => n.remove());
    });
    try {
        const res = await api("/task", { method: "GET" });
        const tasks = res.task || [];
        tasks.forEach((t) => {
            const col = cols[t.status] || cols[STATUS.UP_NEXT];
            if (!col) return;
            const card = document.createElement("div");
            card.className = "task-card";
            card.dataset.id = t.id;
            const move =
                t.status === STATUS.DONE
                    ? `<span class="btn ghost" style="font-size:0.7rem;padding:0.2rem 0.4rem;">done</span>`
                    : `<select class="task-move" aria-label="Move task">
                        <option value="" disabled selected>Move…</option>
                        <option value="${STATUS.UP_NEXT}">Up next</option>
                        <option value="${STATUS.IN_PROGRESS}">In progress</option>
                        <option value="${STATUS.DONE}">Done</option>
                    </select>`;
            card.innerHTML = `
                <div>${escapeHtml(t.title)}</div>
                ${t.discription ? `<div class="meta">${escapeHtml(t.discription)}</div>` : ""}
                <div class="task-actions">${move}</div>
            `;
            const sel = card.querySelector(".task-move");
            if (sel) {
                sel.addEventListener("change", async () => {
                    const status = sel.value;
                    if (!status) return;
                    try {
                        await api("/task-move", {
                            method: "PATCH",
                            body: JSON.stringify({ id: t.id, status }),
                        });
                        await loadTasks();
                    } catch {
                        sel.selectedIndex = 0;
                    }
                });
            }
            col.appendChild(card);
        });
    } catch {
        showView("dashboard");
    }
}

function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}

async function loadOrgMembers() {
    const list = document.getElementById("member-list");
    if (!list) return;
    list.innerHTML = "";
    try {
        const res = await api("/org", { method: "GET" });
        const members = res.org?.user || [];
        members.forEach((email) => {
            const row = document.createElement("div");
            row.className = "member-row";
            row.innerHTML = `<span>${escapeHtml(email)}</span>`;
            list.appendChild(row);
        });
    } catch {
        list.innerHTML = '<p class="msg error">Could not load members.</p>';
    }
}

document.addEventListener("DOMContentLoaded", init);

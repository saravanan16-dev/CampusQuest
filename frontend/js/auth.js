/**
 * CampusQuest Authentication & Layout Utilities
 */

const Auth = {
    isAuthenticated() {
        return !!API.getToken();
    },

    getUser() {
        return API.getUser();
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === "ADMIN";
    },

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = "login.html";
            return false;
        }
        return true;
    },

    requireAdmin() {
        if (!this.requireAuth()) return false;
        if (!this.isAdmin()) {
            alert("Access restricted to administrators.");
            window.location.href = "dashboard.html";
            return false;
        }
        return true;
    },

    logout() {
        API.clearAuth();
        window.location.href = "login.html";
    },

    async initNavbar() {
        const user = this.getUser();
        const userContainer = document.getElementById("navbar-user-section");
        const adminLinks = document.querySelectorAll(".admin-only");

        if (this.isAuthenticated() && user) {
            // Show admin links if user is admin
            if (user.role === "ADMIN") {
                adminLinks.forEach(el => el.classList.remove("d-none"));
            } else {
                adminLinks.forEach(el => el.classList.add("d-none"));
            }

            // Fetch live gamification stats for header badge
            let streak = 0;
            let xp = 0;
            let levelTitle = "Beginner";
            try {
                const profileRes = await API.getProfile();
                if (profileRes.success && profileRes.data.gamification) {
                    streak = profileRes.data.gamification.current_streak;
                    xp = profileRes.data.gamification.total_xp;
                    levelTitle = profileRes.data.gamification.level_title;
                }
            } catch (e) {
                // fallback
            }

            if (userContainer) {
                userContainer.innerHTML = `
                    <div class="d-flex align-items-center gap-3">
                        <div class="d-none d-md-flex align-items-center gap-2">
                            <span class="badge bg-warning text-dark px-2.5 py-1.5 rounded-pill shadow-sm" title="Active Streak">
                                🔥 <strong id="header-streak-count">${streak}</strong>d streak
                            </span>
                            <span class="badge bg-primary text-white px-2.5 py-1.5 rounded-pill shadow-sm" title="XP Points">
                                ⚡ <strong id="header-xp-count">${xp}</strong> XP (${levelTitle})
                            </span>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-outline-light dropdown-toggle d-flex align-items-center gap-2 rounded-pill px-3 py-1.5" type="button" data-bs-toggle="dropdown">
                                <span class="avatar-circle">${user.name ? user.name.charAt(0).toUpperCase() : "U"}</span>
                                <span class="d-none d-sm-inline fw-semibold">${user.name.split(" ")[0]}</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                                <li>
                                    <div class="dropdown-header">
                                        <div class="fw-bold text-dark">${user.name}</div>
                                        <small class="text-muted">@${user.username} (${user.role})</small>
                                    </div>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
                                <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person me-2"></i>My Profile</a></li>
                                <li><a class="dropdown-item" href="achievements.html"><i class="bi bi-trophy me-2"></i>Achievements</a></li>
                                ${user.role === "ADMIN" ? '<li><a class="dropdown-item text-primary" href="admin.html"><i class="bi bi-shield-lock me-2"></i>Admin Portal</a></li>' : ''}
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="Auth.logout()"><i class="bi bi-box-arrow-right me-2"></i>Log Out</a></li>
                            </ul>
                        </div>
                    </div>
                `;
            }
        } else {
            adminLinks.forEach(el => el.classList.add("d-none"));
            if (userContainer) {
                userContainer.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <a href="login.html" class="btn btn-outline-light rounded-pill px-3">Sign In</a>
                        <a href="register.html" class="btn btn-primary rounded-pill px-3">Get Started</a>
                    </div>
                `;
            }
        }
    },

    showToast(message, type = "info") {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "position-fixed bottom-0 end-0 p-3";
            container.style.zIndex = "9999";
            document.body.appendChild(container);
        }

        const bgClass = type === "success" ? "bg-success text-white" :
                        type === "error" ? "bg-danger text-white" :
                        type === "warning" ? "bg-warning text-dark" : "bg-dark text-white";

        const toastEl = document.createElement("div");
        toastEl.className = `toast align-items-center border-0 shadow-lg mb-2 ${bgClass}`;
        toastEl.setAttribute("role", "alert");
        toastEl.setAttribute("aria-live", "assertive");
        toastEl.setAttribute("aria-atomic", "true");

        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body fw-semibold">
                    ${message}
                </div>
                <button type="button" class="btn-close ${type !== 'warning' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        container.appendChild(toastEl);
        const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
        toast.show();
        toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
    }
};

window.Auth = Auth;
document.addEventListener("DOMContentLoaded", () => {
    Auth.initNavbar();
});

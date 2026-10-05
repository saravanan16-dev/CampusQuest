/**
 * Login Controller (Phase 2 Section 3 & 11)
 */

function fillDemo(role) {
    if (role === 'admin') {
        document.getElementById('login-input').value = 'admin@campusquest.com';
        document.getElementById('password-input').value = 'Admin@123';
    } else {
        document.getElementById('login-input').value = 'student@campusquest.com';
        document.getElementById('password-input').value = 'Student@123';
    }
}
window.fillDemo = fillDemo;

document.addEventListener("DOMContentLoaded", () => {
    // If already logged in, redirect to dashboard
    if (Auth.isAuthenticated()) {
        const user = Auth.getUser();
        if (user && user.role === 'ADMIN') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
        return;
    }

    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailOrUsername = document.getElementById('login-input').value.trim();
        const password = document.getElementById('password-input').value;
        const errorAlert = document.getElementById('error-alert');
        const submitBtn = document.getElementById('submit-btn');

        if (errorAlert) errorAlert.classList.add('d-none');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Signing in...";
        }

        try {
            const res = await API.login({ emailOrUsername, password });
            if (res.success) {
                const token = res.token || res.data?.token;
                const user = res.data?.user || res.data;
                API.setToken(token);
                API.setUser(user);

                Auth.showToast(`Welcome back, ${user.name}!`, "success");
                setTimeout(() => {
                    window.location.href = user.role === 'ADMIN' ? 'admin.html' : 'dashboard.html';
                }, 500);
            } else {
                if (errorAlert) {
                    errorAlert.innerText = res.message || "Invalid credentials";
                    errorAlert.classList.remove('d-none');
                }
            }
        } catch (err) {
            if (errorAlert) {
                errorAlert.innerText = err.message || "Could not connect to server";
                errorAlert.classList.remove('d-none');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `Sign In <i class="bi bi-arrow-right ms-1"></i>`;
            }
        }
    });
});

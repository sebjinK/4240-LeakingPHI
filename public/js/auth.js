document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();


            document.getElementById("loginMessage").innerText = data.message;

            if (data.ok) {
                // redirect to dashboard after successful login/register
                window.location.href = data.redirect;
            } else {
                alert(data.error || "Login failed");
            }


            if (res.ok) window.location.href = "/dashboard";
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();
            document.getElementById("registerMessage").innerText = data.message;

            if (res.ok) window.location.href = "/dashboard";
        });
    }
});

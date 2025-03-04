// DOM yüklendikten sonra çalışacak şekilde düzenleyelim
document.addEventListener('DOMContentLoaded', function() {
    // Form event listeners
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.querySelector('.register-btn');
    const forgotPasswordLink = document.querySelector('.forgot-password');
    const verifyBtn = document.querySelector('.verify-btn');
    const firstnameInput = document.getElementById('firstname');
    const lastnameInput = document.getElementById('lastname');

    // Bildirim gösterme fonksiyonu
    function showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // API URL'ini yapılandırma
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : 'https://your-railway-app-url.railway.app';

    // Login form handler
    loginForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (data.success) {
                localStorage.setItem('userFullName', `${data.name} ${data.surname}`);
                // Admin kontrolü
                if (email === 'goymenmhmd@gmail.com') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'game.html';
                }
            } else {
                showNotification(data.error || 'Giriş başarısız!');
            }
        } catch (error) {
            showNotification('Sunucu ile bağlantı kurulamadı.');
        }
    });

    // Register button handler
    registerBtn?.addEventListener('click', function() {
        window.location.href = 'register.html';
    });

    // Forgot password handler
    forgotPasswordLink?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'forgot-password.html';
    });

    // Verification button handler
    verifyBtn?.addEventListener('click', async function() {
        const email = document.getElementById('email').value;
        const firstname = document.getElementById('firstname').value;
        const lastname = document.getElementById('lastname').value;

        // İsim ve soyad kontrolü
        if (!/^[A-Za-zğüşıöçĞÜŞİÖÇ]+$/.test(firstname) || !/^[A-Za-zğüşıöçĞÜŞİÖÇ]+$/.test(lastname)) {
            alert('İsim ve soyad sadece harflerden oluşmalıdır.');
            return;
        }

        // E-posta kontrolü
        if (!email.endsWith('@gmail.com')) {
            alert('Lütfen geçerli bir Gmail adresi giriniz.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/send-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('passwordFields').style.display = 'block';
                alert('Doğrulama kodu e-posta adresinize gönderildi.');
            } else {
                alert(data.error || 'Bir hata oluştu.');
            }
        } catch (error) {
            alert('Sunucu ile bağlantı kurulamadı.');
        }
    });

    // Şifremi unuttum formu
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    // Doğrulama kodu gönderme (şifremi unuttum sayfası için)
    document.querySelector('.verify-btn')?.addEventListener('click', async function() {
        const email = document.getElementById('email').value;

        if (!email.endsWith('@gmail.com')) {
            showNotification('Lütfen geçerli bir Gmail adresi giriniz.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/check-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('resetFields').style.display = 'block';
                showNotification('Doğrulama kodu e-posta adresinize gönderildi.');
            } else {
                showNotification(data.error || 'Bu e-posta adresi kayıtlı değil.');
            }
        } catch (error) {
            showNotification('Sunucu ile bağlantı kurulamadı.');
        }
    });

    // Şifre sıfırlama formu
    forgotPasswordForm?.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const verificationCode = document.getElementById('verificationCode').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        // Şifre eşleşme kontrolü
        if (newPassword !== confirmNewPassword) {
            showNotification('Şifreler eşleşmiyor.');
            return;
        }

        // Şifre format kontrolü
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,16}$/;
        if (!passwordRegex.test(newPassword)) {
            showNotification('Şifre 6-16 karakter uzunluğunda olmalı ve en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    verificationCode,
                    newPassword
                })
            });

            const data = await response.json();
            if (data.success) {
                showNotification('Şifreniz başarıyla değiştirildi!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showNotification(data.error || 'Şifre değiştirme başarısız.');
            }
        } catch (error) {
            showNotification('Sunucu ile bağlantı kurulamadı.');
        }
    });

    // Register form handler
    registerForm?.addEventListener('submit', async function(e) {
        e.preventDefault();

        const firstname = document.getElementById('firstname').value;
        const lastname = document.getElementById('lastname').value;
        
        // İsim ve soyad kontrolü güncellendi
        const nameRegex = /^[A-Za-zğüşıöçĞÜŞİÖÇ]+$/;
        if (!nameRegex.test(firstname) || !nameRegex.test(lastname)) {
            alert('İsim ve soyad sadece harflerden oluşmalıdır!');
            return;
        }

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Şifre kontrolü
        if (password !== confirmPassword) {
            alert('Şifreler eşleşmiyor.');
            return;
        }

        // Şifre format kontrolü
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,16}$/;
        if (!passwordRegex.test(password)) {
            alert('Şifre 6-16 karakter uzunluğunda olmalı ve en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.');
            return;
        }

        const formData = {
            name: document.getElementById('firstname').value,
            surname: document.getElementById('lastname').value,
            email: document.getElementById('email').value,
            password: password,
            verificationCode: document.getElementById('verificationCode').value
        };

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                alert('Hesabınız başarıyla oluşturuldu!');
                window.location.href = 'index.html';
            } else {
                alert(data.error || 'Bir hata oluştu.');
            }
        } catch (error) {
            alert('Sunucu ile bağlantı kurulamadı.');
        }
    });

    // İsim ve soyad input kontrolleri
    firstnameInput?.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-zğüşıöçĞÜŞİÖÇ]/g, '');
    });

    lastnameInput?.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^A-Za-zğüşıöçĞÜŞİÖÇ]/g, '');
    });

    // Tab ve Enter tuşu desteği
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const focusedElement = document.activeElement;
            
            if (focusedElement.tagName === 'BUTTON') {
                focusedElement.click();
            } else if (focusedElement.tagName === 'INPUT') {
                const form = focusedElement.closest('form');
                if (form) {
                    const buttons = form.querySelectorAll('button');
                    const submitButton = Array.from(buttons).find(button => 
                        button.type === 'submit' || 
                        button.classList.contains('verify-btn') ||
                        button.classList.contains('register-submit-btn')
                    );
                    if (submitButton) {
                        submitButton.click();
                    }
                }
            }
        }
    });

    // Tüm tıklanabilir elementlere tab index ekle
    document.querySelectorAll('button, input, a').forEach(element => {
        if (!element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }
    });

    document.querySelector('.start-game-btn')?.addEventListener('click', function() {
        startGame();
    });
});

function startGame() {
    window.location.href = 'play.html';
}

// Game sayfası için kullanıcı bilgilerini yükleme
if (window.location.href.includes('game.html')) {
    const userFullName = localStorage.getItem('userFullName');
    if (userFullName) {
        document.getElementById('userFullName').textContent = userFullName;
    } else {
        window.location.href = 'index.html';
    }
}

// Çıkış fonksiyonu
function logout() {
    localStorage.removeItem('userFullName');
    window.location.href = 'index.html';
}

// Geri tuşu fonksiyonu (global scope'ta kalmalı)
function goBack() {
    if (document.title.includes('Şifremi Unuttum')) {
        window.location.href = 'index.html';
    } else if (document.title.includes('Hesap Oluştur')) {
        window.location.href = 'index.html';
    }
}

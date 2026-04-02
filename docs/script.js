document.addEventListener('DOMContentLoaded', () => {
    const langToggle = document.getElementById('lang-toggle');
    const body = document.body;

    // Load saved preference
    const savedLang = localStorage.getItem('fcopier-lang') || 'en';
    if (savedLang === 'id') {
        body.classList.add('lang-id');
        langToggle.textContent = 'Switch to English';
    }

    langToggle.addEventListener('click', (e) => {
        e.preventDefault();
        if (body.classList.contains('lang-id')) {
            body.classList.remove('lang-id');
            langToggle.textContent = 'Ganti ke Bahasa Indonesia';
            localStorage.setItem('fcopier-lang', 'en');
        } else {
            body.classList.add('lang-id');
            langToggle.textContent = 'Switch to English';
            localStorage.setItem('fcopier-lang', 'id');
        }
    });

    // Smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

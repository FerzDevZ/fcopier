document.addEventListener('DOMContentLoaded', () => {
    const langToggle = document.getElementById('lang-toggle');
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar-nav');
    const body = document.body;

    // --- Language Switcher ---
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

    // --- Mobile Menu Toggle ---
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        menuToggle.textContent = sidebar.classList.contains('mobile-open') ? '×' : '≡';
    });

    // Close sidebar when link is clicked (mobile)
    const sidebarLinks = document.querySelectorAll('.nav-link-custom');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            menuToggle.textContent = '≡';
        });
    });

    // --- Copy to Clipboard ---
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.nextElementSibling.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.color = '#fff';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.color = '';
                }, 2000);
            });
        });
    });

    // --- ScrollSpy & Smooth Scroll ---
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link-custom');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - 100)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });
});

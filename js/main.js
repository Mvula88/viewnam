// ===========================
// ViewNam — Main JavaScript
// ===========================

document.addEventListener('DOMContentLoaded', () => {

    // --- Dynamic copyright year ---
    const yearEl = document.getElementById('copyrightYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // --- Load bank details from Supabase ---
    (async function loadBankDetails() {
        if (typeof supabase === 'undefined' || !supabase) return;
        try {
            const { data } = await supabase.from('settings').select('*').in('key', ['bank_name','bank_account_name','bank_account_number','bank_branch_code']);
            if (!data) return;
            const get = (key) => data.find(d => d.key === key)?.value || '';
            const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
            set('payBank', get('bank_name'));
            set('payAcctName', get('bank_account_name'));
            set('payAcctNum', get('bank_account_number'));
            set('payBranch', get('bank_branch_code'));
        } catch (e) { /* silent */ }
    })();

    // --- Load real reviews from Supabase ---
    (async function loadRealReviews() {
        const row = document.getElementById('testimonialRow');
        if (!row || typeof supabase === 'undefined' || !supabase) return;
        try {
            const { data } = await supabase
                .from('reviews')
                .select('*')
                .eq('is_public', true)
                .gte('rating', 4)
                .order('rating', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(3);

            if (!data || data.length < 3) return; // Keep static fallbacks if fewer than 3 real reviews

            row.innerHTML = data.map(r => {
                const stars = '★'.repeat(r.rating);
                const comment = r.comment || 'Great service from ViewNam.';
                const author = r.client_name ? r.client_name.split(' ')[0] + (r.client_name.split(' ')[1] ? ' ' + r.client_name.split(' ')[1].charAt(0) + '.' : '') : 'Client';
                const location = r.client_location || 'Namibia';
                return `<blockquote class="testimonial-card">
                    <div style="color:#D4A843;font-size:1.1rem;margin-bottom:8px;letter-spacing:2px;">${stars}</div>
                    <p>"${comment}"</p>
                    <cite>— ${author}, ${location}</cite>
                </blockquote>`;
            }).join('');
        } catch (e) { /* keep static fallbacks */ }
    })();

    // --- Navbar scroll effect ---
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    });

    // --- Mobile menu toggle ---
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');

    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        const spans = mobileToggle.querySelectorAll('span');
        if (navLinks.classList.contains('open')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        }
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            const spans = mobileToggle.querySelectorAll('span');
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        });
    });

    // --- Active nav link on scroll ---
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY + 100;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            const link = document.querySelector(`.nav-links a[href="#${id}"]`);
            if (link) {
                link.classList.toggle('active', scrollY >= top && scrollY < top + height);
            }
        });
    });

    // --- FAQ accordion ---
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });

    // =============================================
    // MULTI-STEP FORM
    // =============================================
    let currentFormStep = 1;
    const totalFormSteps = 4;

    window.nextStep = function() {
        if (currentFormStep >= totalFormSteps) return;
        currentFormStep++;
        updateFormStep();
    };

    window.prevStep = function() {
        if (currentFormStep <= 1) return;
        currentFormStep--;
        updateFormStep();
    };

    function updateFormStep() {
        // Update steps
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
        const activeStep = document.querySelector(`.form-step[data-step="${currentFormStep}"]`);
        if (activeStep) activeStep.classList.add('active');

        // Update indicators
        document.querySelectorAll('.step-ind').forEach(ind => {
            const step = parseInt(ind.dataset.step);
            ind.classList.remove('active', 'done');
            if (step === currentFormStep) ind.classList.add('active');
            else if (step < currentFormStep) ind.classList.add('done');
        });

        // Scroll to form top
        document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    }

    // =============================================
    // BOOKING FORM SUBMISSION
    // =============================================
    const bookingForm = document.getElementById('bookingForm');
    const successModal = document.getElementById('successModal');
    const bookingRef = document.getElementById('bookingRef');

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate at least one service is selected
        const selectedServices = bookingForm.querySelectorAll('input[name="services"]:checked');
        if (selectedServices.length === 0) {
            alert('Please select at least one service.');
            return;
        }

        // Find submit button and disable it with loading state
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Submitting...';
            submitBtn.style.opacity = '0.7';
            submitBtn.style.cursor = 'wait';
        }

        // Generate reference number
        const ref = 'VN-' + Date.now().toString(36).toUpperCase();
        bookingRef.textContent = ref;
        const payRef = document.getElementById('payRef');
        if (payRef) payRef.textContent = ref;

        // Collect form data
        const formData = new FormData(bookingForm);
        const data = {};
        formData.forEach((value, key) => {
            if (key === 'services') {
                if (!data.services) data.services = [];
                data.services.push(value);
            } else {
                data[key] = value;
            }
        });
        data.reference = ref;
        data.submittedAt = new Date().toISOString();
        data.status = 'new';

        // Save to Supabase + localStorage backup
        const result = await saveBooking(data);

        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            submitBtn.style.opacity = '';
            submitBtn.style.cursor = '';
        }

        if (!result.success) {
            alert('Could not submit your booking: ' + result.error + '\n\nYour details have been saved locally. Please try again or contact us on WhatsApp.');
            return;
        }

        // Show success modal
        successModal.classList.add('active');

        // Reset form
        bookingForm.reset();
        // Reset to step 1
        if (typeof currentFormStep !== 'undefined') {
            currentFormStep = 1;
            updateFormStep();
        }
    });

    // --- Save booking to Supabase + localStorage fallback ---
    async function saveBooking(data) {
        // Always save to localStorage as backup
        try {
            const bookings = JSON.parse(localStorage.getItem('viewnam_bookings') || '[]');
            bookings.unshift(data);
            localStorage.setItem('viewnam_bookings', JSON.stringify(bookings));
        } catch (e) {
            console.error('localStorage save failed:', e);
        }

        // Save to Supabase if available
        if (typeof supabase !== 'undefined' && supabase) {
            try {
                const { error } = await supabase.from('bookings').insert({
                    reference: data.reference,
                    status: 'new',
                    client_name: data.fullName,
                    client_phone: data.phone,
                    client_email: data.email || null,
                    client_location: data.buyerLocation,
                    vehicle_make: data.vehicleMake,
                    vehicle_model: data.vehicleModel,
                    vehicle_year: data.vehicleYear,
                    asking_price: data.askingPrice || null,
                    vehicle_link: data.vehicleLink || null,
                    seller_location: data.sellerLocation,
                    seller_contact: data.sellerContact || null,
                    services: data.services || [],
                    notes: data.notes || null,
                });
                if (error) {
                    console.error('Supabase insert error:', error);
                    return { success: false, error: error.message };
                }
                return { success: true };
            } catch (e) {
                console.error('Supabase save failed:', e);
                return { success: false, error: e.message || 'Network error' };
            }
        }
        return { success: false, error: 'Database not available' };
    }

    // --- Close modal ---
    window.closeModal = () => {
        successModal.classList.remove('active');
    };

    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) closeModal();
    });

    // --- Scroll animations ---
    const animateElements = document.querySelectorAll(
        '.problem-card, .step-card, .service-card, .pricing-card, .testimonial-card, .value'
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in', 'visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animateElements.forEach(el => {
        el.classList.add('animate-in');
        observer.observe(el);
    });

    // --- Smooth scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

});

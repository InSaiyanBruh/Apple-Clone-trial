gsap.registerPlugin(ScrollTrigger);

// Track if the intro animation has played
let hasIntroAnimationPlayed = false;

// Function to run the intro animation
function runIntroAnimation() {
    if (hasIntroAnimationPlayed) return;

    const introOverlay = document.getElementById('introOverlay');
    const introTitle = document.querySelector('.intro-title');
    const introSubtitle = document.querySelector('.intro-subtitle');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    if (!introOverlay) return;

    // Set initial state for elements
    gsap.set([introTitle, introSubtitle, scrollIndicator], {
        opacity: 0,
        y: 20
    });

    // Show the overlay
    introOverlay.classList.add('show');

    // Animate the title and subtitle
    gsap.to(
        [introTitle, introSubtitle, scrollIndicator],
        {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.2,
            ease: 'power2.out',
            delay: 0.3,
            onComplete: () => {
                hasIntroAnimationPlayed = true;
            }
        }
    );
}

// Loader functionality
window.addEventListener('load', function () {
    const loader = document.getElementById('loader');

    // Add a minimum loading time for better UX (2 seconds)
    setTimeout(() => {
        loader.classList.add('fade-out');

        // Remove loader from DOM after fade out animation
        setTimeout(() => {
            loader.style.display = 'none';
            // Run the intro animation after loader is hidden
            runIntroAnimation();
        }, 500);
    }, 2000);
});

// Track scroll position for smooth fade effect
let lastScrollY = window.scrollY;

// Intro overlay scroll functionality: fade out when scrolling down, stay fully visible when scrolling up
window.addEventListener('scroll', function () {
    const introOverlay = document.getElementById('introOverlay');
    if (!introOverlay) return;

    const currentScrollY = window.scrollY;
    const threshold = 50; // px

    // Only fade out when scrolling down, stay fully visible when scrolling up
    if (currentScrollY > lastScrollY && currentScrollY > threshold) {
        // Scrolling down - fade out
        introOverlay.style.opacity = Math.max(0, 1 - (currentScrollY - threshold) / 200);
    } else {
        // Scrolling up - always fully visible
        introOverlay.style.opacity = 1;
    }

    // Hide completely when scrolled past a certain point
    if (currentScrollY > 300) {
        introOverlay.style.display = 'none';
    } else {
        introOverlay.style.display = 'flex';
    }

    lastScrollY = currentScrollY;
});

// Also hide loader if page takes too long (fallback after 10 seconds)
setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader && !loader.classList.contains('fade-out')) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}, 10000);

gsap.fromTo("#feature",
    { opacity: 0 },
    {
        x: '-100',
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
            trigger: "#feature",
            start: "top 80%",
            end: "bottom 20%",
            scrub: true,
            markers: false,
        }
    },
)

gsap.fromTo("#iphone",
    { opacity: 0 },
    {
        opacity: 1,
        x: 100,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
            trigger: "#iphone",
            start: "top 80%",
            end: "bottom 20%",
            scrub: true,
            markers: false,
        }
    },
)


let video = document.getElementById("batteryVideo");

// Only add video animations if video element exists
if (video) {
    gsap.fromTo("#batteryVideo",
        { scale: 1 },  // initial scale
        {
            scale: 1.9,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: "#batteryVideo",
                start: "top 80%",    // when video enters viewport
                end: "bottom 20%",   // until it leaves
                scrub: true,         // smooth scroll-linked animation
                markers: false,       // remove later

                // video controls with error handling
                onEnter: () => {
                    try {
                        video.play();
                    } catch (e) {
                        console.log("Video play failed:", e);
                    }
                },
                onLeave: () => {
                    try {
                        video.pause();
                    } catch (e) {
                        console.log("Video pause failed:", e);
                    }
                },
                onEnterBack: () => {
                    try {
                        video.play();
                    } catch (e) {
                        console.log("Video play failed:", e);
                    }
                },
                onLeaveBack: () => {
                    try {
                        video.pause();
                    } catch (e) {
                        console.log("Video pause failed:", e);
                    }
                }
            }
        }
    );
}

// Swiper Init
const swiper = new Swiper(".swiper", {
    slidesPerView: 1.2,      // show slightly more than 1 card
    centeredSlides: true,    // keep active slide in the center
    spaceBetween: 10,        // reduce gap between cards
    loop: false,
    navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
    },
    breakpoints: {
        768: {
            slidesPerView: 2.2,  // on tablet show ~2 slides
            spaceBetween: 20,
        },
        1024: {
            slidesPerView: 3,    // on desktop show 3 slides
            spaceBetween: 30,
        }
    }
});



const menu = document.querySelector('.menu');
const menuicon = document.querySelector('.menu-icon');
const closeicon = document.querySelector('.close-icon');

function startSlideshow(container, interval = 4000) {
    const slides = container.querySelectorAll("img");
    let index = 0;

    function showSlide() {
        slides.forEach(img => img.classList.add("hidden"));
        slides[index].classList.remove("hidden");
        index = (index + 1) % slides.length;
    }

    setInterval(showSlide, interval);
    showSlide(); // show first image immediately
}

// Run slideshow for each container with class "slides"
document.querySelectorAll(".slides").forEach(slidesContainer => {
    startSlideshow(slidesContainer);
});

function openModal() {
    document.getElementById("infoModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("infoModal").style.display = "none";
}

// Close modal when clicking outside content
window.onclick = function (e) {
    if (e.target === document.getElementById("infoModal")) {
        closeModal();
    }
}

// Animation to open menu
function openMenu() {
    menu.classList.remove('hidden');
    menu.classList.add('flex');
    gsap.fromTo(menu,
        { x: '-100%' },
        { x: '0%', duration: 0.5, ease: 'power3.out' }
    );
}

// Animation to close menu
function closeMenu() {
    gsap.to(menu, {
        x: '-100%',
        duration: 0.5,
        ease: 'power3.in',
        onComplete: () => {
            menu.classList.add('hidden');
            menu.classList.remove('flex');
        }
    });
}

menuicon.addEventListener('click', openMenu);
closeicon.addEventListener('click', closeMenu);


// canvas animation from here
const canvas = document.getElementById('canvas');
console.log(canvas);

if (!canvas) {
    console.error('Canvas element not found!');
} else {
    const ctx = canvas.getContext('2d');

    const frames = {
        currentIndex: 0,
        maxIndex: 188
    }

    let imagesLoaded = 0
    const images = []

    function preloadImages() {
        for (let i = 1; i <= frames.maxIndex; i++) {
            const image = `/pics/iphone-${i.toString().padStart(2, "0")}.png`;
            const img = new Image();
            img.src = image;
            img.onload = () => {
                imagesLoaded++;
                if (imagesLoaded === frames.maxIndex) {
                    loadImage(frames.currentIndex);
                    animate();
                }
            }
            img.onerror = () => {
                console.error(`Failed to load image: ${image}`);
            }
            images.push(img);
        }
    }

    function loadImage(index) {
        // Clamp index between 0 and the last available frame
        index = Math.max(0, Math.min(index, images.length - 1));

        const img = images[index];
        if (!img) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        const scale = Math.max(scaleX, scaleY);

        const newWidth = img.width * scale;
        const newHeight = img.height * scale;

        const x = (canvas.width - newWidth) / 2;
        const y = (canvas.height - newHeight) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, x, y, newWidth, newHeight);

        frames.currentIndex = index;
    }

    function animate() {
        var tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".parent",
                start: "top top",
                end: "bottom bottom",
                scrub: 2,
            }
        })

        tl.to(frames, {
            currentIndex: frames.maxIndex,
            onUpdate: function () {
                loadImage(Math.floor(frames.currentIndex))
            },
        })
    }

    preloadImages();
}

const menuIcon = document.querySelector('.menu-icon')
console.log(menuIcon);
menuIcon.addEventListener('click', () => {
    console.log('clicked');
})

const rotateleft = document.querySelector('.ri-arrow-left-circle-line')
const rotateright = document.querySelector('.ri-arrow-right-circle-line')
const rotate = document.querySelector('.SliderCircle')

  // Keep a running angle so rotation accumulates and stays centered
  let currentAngle = 0;
  const step = 45; // degrees per click (adjust as desired)

  rotateleft.addEventListener('click', () => {
      currentAngle -= step;
      rotate.style.setProperty('--ring-rot', `${currentAngle}deg`);
      updateSliderInfo();
  })

  rotateright.addEventListener('click', () => {
      currentAngle += step;
      rotate.style.setProperty('--ring-rot', `${currentAngle}deg`);
      updateSliderInfo();
  })

// Circular slider metadata and info updater
const products = [
  { title: 'iPhone 15', speciality: 'A16 chip. Dynamic Island. Dual‑camera system.', link: '/product/iPhone 15' },
  { title: 'iPhone 15 Pro', speciality: 'Titanium design. A17 Pro. Pro camera system.', link: '/product/iPhone 15 Pro' },
  { title: 'iPhone 16', speciality: 'Next‑gen performance and smarter experiences.', link: '/product/iPhone16' },
  { title: 'iPhone 16 Pro', speciality: 'ProMotion display. A18 Pro. Computational photography.', link: '/product/iPhone 16 Pro' },
  { title: 'iPhone 16 Pro Max', speciality: 'Largest display. Longest battery. Ultimate Pro camera.', link: '/product/iPhone 16 Pro Max' },
  { title: 'iPhone 17', speciality: 'Refined design. Smarter silicon. All‑day battery.', link: '/product/iPhone 17' },
  { title: 'iPhone 17 Pro', speciality: 'Forged aluminium. A19 Pro. Advanced Apple Intelligence.', link: '/product/iPhone 17 Pro Max' },
  { title: 'iPhone 17 Pro Max', speciality: 'Biggest Pro display. Best battery. Most advanced camera.', link: '/product/iPhone 17 Pro Max' },
];

const sliderTitleEl = document.getElementById('slider-title');
const sliderSpecEl = document.getElementById('slider-speciality');
const sliderLinkEl = document.getElementById('slider-link');

function getTopIndex() {
  // Map the current angle (multiple of 45) to which image sits at the top.
  // With --ring-rot = 0deg, nth-child(7) (index 6) is at 270deg which is visually at the top.
  const steps = ((Math.round(currentAngle / 45)) % 8 + 8) % 8; // normalize 0..7
  const topAtZero = 6; // index at top when currentAngle = 0
  const topIndex = (topAtZero - steps + 8) % 8;
  return topIndex;
}

function updateSliderInfo() {
  if (!sliderTitleEl || !sliderSpecEl || !sliderLinkEl) return;
  const idx = getTopIndex();
  const p = products[idx];
  if (!p) return;
  sliderTitleEl.textContent = p.title;
  sliderSpecEl.textContent = p.speciality;
  sliderLinkEl.setAttribute('href', p.link);
}

// Initialize info on load
document.addEventListener('DOMContentLoaded', () => {
  updateSliderInfo();
});

const moreInfoButton = document.querySelector('.MoreInfoButton')
const moreInfo = document.querySelector('.MoreInfo')

moreInfoButton.addEventListener('click', () => {
    moreInfo.classList.toggle('hidden');
    if (moreInfo.classList.contains('hidden')) {
        moreInfoButton.innerHTML = '<h3>Less Info<i class="ri-arrow-up-s-line"></i></h3>';
        moreInfo.style.display = 'block';
    } else {
        moreInfoButton.innerHTML = '<h3>More Info<i class="ri-arrow-down-s-line"></i></h3>';
        moreInfo.style.display = 'none';
    }
})

// Battery video 2 - stop at last frame
const batteryVideo2 = document.getElementById('batteryVideo2');
if (batteryVideo2) {
    batteryVideo2.addEventListener('ended', function () {
        // Keep video at last frame
        this.currentTime = this.duration;
    });
}
(function () {
  'use strict';
  console.log('Custom Bootstrap validation loaded ✅');

  const forms = document.querySelectorAll('.needs-validation');

  Array.from(forms).forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }

      form.classList.add('was-validated');
    }, false);
  });

  // Handle navbar collapse on mobile
  const navbarCollapse = document.getElementById('navbarNav');
  const navbarToggler = document.querySelector('.navbar-toggler');
  const closeButton = document.querySelector('.btn-close');

  if (navbarCollapse && navbarToggler && closeButton) {
    // Close button functionality
    closeButton.addEventListener('click', () => {
      const bsCollapse = new bootstrap.Collapse(navbarCollapse, { toggle: false });
      bsCollapse.hide();
    });

    // Close navbar when clicking outside
    document.addEventListener('click', (event) => {
      if (!navbarCollapse.contains(event.target) && !navbarToggler.contains(event.target) && navbarCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navbarCollapse, { toggle: false });
        bsCollapse.hide();
      }
    });
  }
})();
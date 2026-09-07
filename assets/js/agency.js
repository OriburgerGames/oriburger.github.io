/*!
 * Based on Start Bootstrap - Agency v5.2.2 (https://startbootstrap.com/template-overviews/agency)
 * Copyright 2013-2019 Start Bootstrap, licensed under MIT
 * Extended with scroll-reveal animations and a light/dark theme toggle.
 */
(function ($) {
  "use strict";

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Smooth scrolling for in-page anchors
  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').on("click", function () {
    var samePage =
      location.pathname.replace(/^\//, "") === this.pathname.replace(/^\//, "") &&
      location.hostname === this.hostname;
    if (!samePage) return;

    var $target = $(this.hash);
    $target = $target.length ? $target : $("[name=" + this.hash.slice(1) + "]");
    if (!$target.length) return;

    $("html, body").animate(
      { scrollTop: $target.offset().top - 54 },
      reduceMotion ? 0 : 1000,
      "easeInOutExpo"
    );
    return false;
  });

  // Close the mobile menu after choosing an item
  $(".js-scroll-trigger").on("click", function () {
    $(".navbar-collapse").collapse("hide");
  });

  // Highlight the nav item of the section in view
  $("body").scrollspy({ target: "#mainNav", offset: 56 });

  // Collapse the navbar once the page is scrolled
  var $nav = $("#mainNav");
  function shrinkNav() {
    $nav.toggleClass("navbar-shrink", $nav.offset().top > 100);
  }
  shrinkNav();
  $(window).on("scroll", shrinkNav);

  // Scroll-reveal: `.reveal` elements fade in the first time they enter the viewport
  var revealTargets = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  // Light / dark theme
  // Without a stored choice the CSS follows prefers-color-scheme; a click stores an explicit choice.
  var root = document.documentElement;
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var toggles = Array.prototype.slice.call(document.querySelectorAll("[data-theme-toggle]"));

  function activeTheme() {
    return root.getAttribute("data-theme") || (darkQuery && darkQuery.matches ? "dark" : "light");
  }

  function syncThemeUi() {
    var isDark = activeTheme() === "dark";
    toggles.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(isDark));
    });
    if (themeMeta) themeMeta.setAttribute("content", isDark ? "#0d1013" : "#212529");
  }

  toggles.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = activeTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        // Storage may be unavailable (private mode); the choice then lasts for this page only.
      }
      syncThemeUi();
    });
  });

  if (darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener("change", syncThemeUi);
  }
  syncThemeUi();
})(jQuery);

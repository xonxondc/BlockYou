(function () {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    skipAds: true,
    muteAds: true,
    hideSponsored: true,
    shortsClean: true,
    ultra: false,
    blockPremium: true
  };

  let settings = { ...DEFAULTS };
  let stats = { blocked: 0, timeSaved: 0 };
  let lastAdTime = 0;
  let observer = null;

  // Load settings + stats
  function load(cb) {
    chrome.storage.sync.get(['settings', 'stats'], (data) => {
      if (data.settings) settings = { ...DEFAULTS, ...data.settings };
      if (data.stats) stats = data.stats;
      if (cb) cb();
    });
  }

  function saveStats() {
    chrome.storage.sync.set({ stats });
  }

  function incrementBlocked(seconds = 15) {
    stats.blocked += 1;
    stats.timeSaved += seconds;
    saveStats();
  }

  // Apply ultra class
  function applyUltra() {
    if (settings.ultra) {
      document.body.classList.add('blockyou-ultra');
    } else {
      document.body.classList.remove('blockyou-ultra');
    }
  }

  // Skip / speed through video ads
  function handleVideoAds() {
    if (!settings.enabled || !settings.skipAds) return;

    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (!video) return;

    // Strict ad detection: only act when the player is clearly in ad mode
    const player = document.querySelector('.html5-video-player');
    const isAdShowing = player && player.classList.contains('ad-showing');
    const hasAdOverlay = !!document.querySelector('.ytp-ad-player-overlay, .ytp-ad-module, .video-ads.ytp-ad-module');
    const skipBtn = document.querySelector(
      '.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container button'
    );

    // Only proceed if we are confidently in an ad
    if (!isAdShowing && !hasAdOverlay && !skipBtn) return;

    // Mute if enabled
    if (settings.muteAds && !video.muted) {
      video.muted = true;
    }

    // Prefer clicking the official skip button
    if (skipBtn) {
      skipBtn.click();
      incrementBlocked(5);
      return;
    }

    // Force skip only for short unskippable ads (typical ads are under ~60s)
    // Never touch long content videos
    if (
      isAdShowing &&
      video.duration &&
      isFinite(video.duration) &&
      video.duration < 90 &&
      video.currentTime < video.duration - 0.4
    ) {
      const now = Date.now();
      if (now - lastAdTime > 1000) {
        video.currentTime = Math.max(0, video.duration - 0.15);
        lastAdTime = now;
        incrementBlocked(Math.min(Math.round(video.duration) || 15, 30));
      }
    }
  }

  // Hide sponsored / promoted items in feed
  function cleanFeed() {
    if (!settings.enabled || !settings.hideSponsored) return;

    // Home / Search / Related
    const selectors = [
      'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
      'ytd-rich-item-renderer:has(ytd-display-ad-renderer)',
      'ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer)',
      'ytd-compact-promoted-video-renderer',
      'ytd-search-pyv-renderer',
      'ytd-promoted-video-renderer',
      'ytd-in-feed-ad-layout-renderer'
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!el.hasAttribute('data-blockyou')) {
          el.style.display = 'none';
          el.setAttribute('data-blockyou', '1');
          incrementBlocked(0);
        }
      });
    });
  }

  // Shorts clean
  function cleanShorts() {
    if (!settings.enabled || !settings.shortsClean) return;
    if (!location.pathname.startsWith('/shorts')) return;

    document.querySelectorAll('ytd-reel-video-renderer, ytd-reel-item-renderer').forEach(el => {
      if (el.querySelector('ytd-ad-slot-renderer, [class*="ad-"], .ytp-ad-module')) {
        el.style.display = 'none';
        if (!el.hasAttribute('data-blockyou')) {
          el.setAttribute('data-blockyou', '1');
          incrementBlocked(5);
        }
      }
    });
  }

  // Remove Premium / anti-adblock popups
  function blockPremium() {
    if (!settings.enabled || !settings.blockPremium) return;

    const dialogs = document.querySelectorAll(
      'ytd-enforcement-message-view-model, tp-yt-paper-dialog, ytd-popup-container, yt-confirm-dialog-renderer'
    );

    dialogs.forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      if (
        text.includes('ad blocker') ||
        text.includes('adblock') ||
        text.includes('premium') ||
        text.includes('youtube premium') ||
        text.includes('block ads') ||
        el.querySelector('a[href*="premium"]')
      ) {
        el.remove();
      }
    });
  }

  // Main loop
  function tick() {
    if (!settings.enabled) return;
    handleVideoAds();
    cleanFeed();
    cleanShorts();
    blockPremium();
    applyUltra();
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      tick();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Init
  function init() {
    load(() => {
      applyUltra();
      tick();
      startObserver();
      setInterval(tick, 700);
    });
  }

  // React to settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      settings = { ...DEFAULTS, ...changes.settings.newValue };
      applyUltra();
      tick();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

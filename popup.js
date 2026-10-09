document.addEventListener('DOMContentLoaded', () => {
  const enabled = document.getElementById('enabled');
  const skipAds = document.getElementById('skipAds');
  const muteAds = document.getElementById('muteAds');
  const hideSponsored = document.getElementById('hideSponsored');
  const shortsClean = document.getElementById('shortsClean');
  const blockPremium = document.getElementById('blockPremium');
  const ultra = document.getElementById('ultra');
  const blockedCount = document.getElementById('blockedCount');
  const timeSaved = document.getElementById('timeSaved');
  const status = document.getElementById('status');
  const resetStats = document.getElementById('resetStats');

  const defaults = {
    enabled: true,
    skipAds: true,
    muteAds: true,
    hideSponsored: true,
    shortsClean: true,
    ultra: false,
    blockPremium: true
  };

  function formatTime(seconds) {
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h + 'h ' + m + 'm';
  }

  function load() {
    chrome.storage.sync.get(['settings', 'stats'], (data) => {
      const s = { ...defaults, ...(data.settings || {}) };
      enabled.checked = s.enabled;
      skipAds.checked = s.skipAds;
      muteAds.checked = s.muteAds;
      hideSponsored.checked = s.hideSponsored;
      shortsClean.checked = s.shortsClean;
      blockPremium.checked = s.blockPremium;
      ultra.checked = s.ultra;

      status.textContent = s.enabled ? 'Active' : 'Paused';
      status.className = 'status' + (s.enabled ? ' active' : '');

      const st = data.stats || { blocked: 0, timeSaved: 0 };
      blockedCount.textContent = st.blocked.toLocaleString();
      timeSaved.textContent = formatTime(st.timeSaved);
    });
  }

  function save() {
    const settings = {
      enabled: enabled.checked,
      skipAds: skipAds.checked,
      muteAds: muteAds.checked,
      hideSponsored: hideSponsored.checked,
      shortsClean: shortsClean.checked,
      blockPremium: blockPremium.checked,
      ultra: ultra.checked
    };
    chrome.storage.sync.set({ settings });
    status.textContent = settings.enabled ? 'Active' : 'Paused';
    status.className = 'status' + (settings.enabled ? ' active' : '');
  }

  [enabled, skipAds, muteAds, hideSponsored, shortsClean, blockPremium, ultra].forEach(el => {
    el.addEventListener('change', save);
  });

  resetStats.addEventListener('click', () => {
    chrome.storage.sync.set({ stats: { blocked: 0, timeSaved: 0 } }, () => {
      blockedCount.textContent = '0';
      timeSaved.textContent = '0s';
    });
  });

  load();
});

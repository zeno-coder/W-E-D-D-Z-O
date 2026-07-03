const root = document.body;
const countdown = document.querySelector('#countdown');
const target = new Date(`${root.dataset.date} ${root.dataset.time}`);
const musicButton = document.querySelector('#musicButton');
let audioContext;
let timer;

function tick() {
  const gap = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(gap / 86400000);
  const hours = Math.floor(gap / 3600000) % 24;
  const minutes = Math.floor(gap / 60000) % 60;
  const seconds = Math.floor(gap / 1000) % 60;
  countdown.innerHTML = [days, hours, minutes, seconds].map((value) => `<strong>${String(value).padStart(2, '0')}</strong>`).join('');
}

function playTone(frequency, start, duration) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(.08, start + .04);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function startMusic() {
  if (root.dataset.music === 'None') {
    return;
  }
  audioContext = audioContext || new AudioContext();
  const notes = root.dataset.music === 'Romantic' ? [392, 440, 523, 659] : root.dataset.music === 'Instrumental' ? [330, 392, 494, 587] : [294, 370, 440, 554];
  let index = 0;
  timer = setInterval(() => {
    playTone(notes[index % notes.length], audioContext.currentTime, .9);
    index += 1;
  }, 900);
}

musicButton.addEventListener('click', () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    musicButton.textContent = 'Music';
  } else {
    startMusic();
    musicButton.textContent = 'Pause';
  }
});

setInterval(tick, 1000);
tick();

document.querySelectorAll('.reveal').forEach((item) => {
  new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: .14 }).observe(item);
});

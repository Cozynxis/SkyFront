// SKYFRONT audio controller. Put the four MP3 files in public/audio/.
const base = import.meta.env.BASE_URL;
const sources = {
  music: 'BackgroundMusic.mp3',
  click: 'UiClick.mp3',
  hover: 'UiHover.mp3',
  play: 'UiPlay.mp3'
};
const sounds = Object.fromEntries(Object.entries(sources).map(([key, filename]) => {
  const audio = new Audio(base + 'audio/' + filename);
  audio.preload = key === 'music' ? 'auto' : 'metadata';
  audio.volume = {music:0.34,click:0.55,hover:0.32,play:0.7}[key];
  audio.loop = key === 'music';
  return [key,audio];
}));
let musicStarted = false;
let lastHover = 0;
function startMusic(){
  if(musicStarted || cinematicPauseCount>0) return;
  sounds.music.play().then(()=>{musicStarted=true;}).catch(()=>{});
}
function effect(key){
  const original = sounds[key];
  if(!original) return;
  const audio = original.cloneNode();
  audio.volume = original.volume;
  audio.play().catch(()=>{});
}
export function installAudio(){
  document.addEventListener('pointerdown',startMusic,{passive:true});
  document.addEventListener('keydown',startMusic);
  document.addEventListener('pointerover',e=>{
    const button=e.target.closest('button');
    if(!button || button.disabled || button.contains(e.relatedTarget)) return;
    const now=performance.now();
    if(now-lastHover<85) return;
    lastHover=now;
    effect('hover');
  });
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');
    if(!button || button.disabled) return;
    effect(button.id==='start-play'?'play':'click');
  });
}

// Cinematic audio ducking: preserve playback position while a reveal runs.
let cinematicPauseCount=0;
export function pauseMusicForCinematic(){
 cinematicPauseCount++;
 if(cinematicPauseCount===1)sounds.music.pause();
}
export function resumeMusicAfterCinematic(){
 cinematicPauseCount=Math.max(0,cinematicPauseCount-1);
 if(cinematicPauseCount===0&&musicStarted)sounds.music.play().catch(()=>{});
}

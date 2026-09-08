const motion=matchMedia('(prefers-reduced-motion: reduce)');
for(const button of document.querySelectorAll('[data-video]')){
 const video=document.getElementById(button.dataset.video);let userPaused=motion.matches;
 const update=()=>{button.textContent=video.paused?'Play preview':'Pause preview';button.setAttribute('aria-label',(video.paused?'Play':'Pause')+' '+video.id.split('-')[0]+' preview');};
 if(motion.matches){video.autoplay=false;video.pause();}else video.play().catch(()=>{});
 button.onclick=()=>{userPaused=!video.paused;if(video.paused)video.play().catch(()=>{});else video.pause();};
 video.addEventListener('play',update);video.addEventListener('pause',update);update();
 new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting&&!userPaused)video.play().catch(()=>{});else video.pause();}},{threshold:.15}).observe(video);
 motion.addEventListener('change',e=>{if(e.matches){userPaused=true;video.pause();}});
}

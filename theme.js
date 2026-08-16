(() => {
  const key='everlight-theme';
  const button=document.getElementById('themeToggle');
  const apply=(mode)=>{
    document.body.classList.toggle('sun-mode', mode==='sun');
    if(button){const img=button.querySelector('img'); if(img) img.src=mode==='sun'?'logo-sun.png':'logo.png'; button.setAttribute('aria-label',mode==='sun'?'Vissza aqua módra':'Napfény mód');}
    localStorage.setItem(key,mode);
  };
  apply(localStorage.getItem(key)==='sun'?'sun':'aqua');
  button?.addEventListener('click',()=>apply(document.body.classList.contains('sun-mode')?'aqua':'sun'));
})();

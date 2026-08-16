(() => {
  const key='everlight-theme';
  const button=document.getElementById('themeToggle');
  const apply=(mode)=>{
    document.body.classList.toggle('sun-mode', mode==='sun');
    const logo=document.querySelector('.header-logo-image');
    if(logo){ logo.src = mode==='sun' ? 'logo-sun.png' : 'logo.png'; }
    if(button){ button.classList.toggle('is-sun', mode==='sun'); button.setAttribute('aria-label',mode==='sun'?'Vissza aqua módra':'Napfény mód'); button.setAttribute('title',mode==='sun'?'Vissza aqua módra':'Napfény mód'); }
    localStorage.setItem(key,mode);
  };
  apply(localStorage.getItem(key)==='sun'?'sun':'aqua');
  button?.addEventListener('click',()=>apply(document.body.classList.contains('sun-mode')?'aqua':'sun'));
})();
try{
  localStorage.setItem('theme','dark');
  document.documentElement.setAttribute('data-theme','dark');
}catch(e){}

(function(){
  var u=function(n){return'<svg class="ic"><use href="#i-'+n+'"/></svg>'};
  window.IC={x:u('x'),back:u('back'),clip:u('clip'),dl:u('dl'),edit:u('edit'),trash:u('trash'),more:u('more'),out:u('out'),expand:u('expand'),heart:u('heart'),chat:u('chat')};
  window.avErr=function(i){var s=document.createElement('span');s.className=i.className;s.textContent=i.getAttribute('data-l')||'?';i.replaceWith(s)};

  function sync(){
    var m=document.querySelector('meta[name=theme-color]');
    if(m) m.setAttribute('content','#000000');
  }

  document.addEventListener('DOMContentLoaded',sync);
})();

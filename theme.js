try{
  var savedTheme = localStorage.getItem('theme') || 'amoled';
  if(savedTheme === 'dark' || savedTheme === 'blue') savedTheme = 'amoled';
  document.documentElement.setAttribute('data-theme', savedTheme);
}catch(e){}

(function(){
  var u=function(n){return'<svg class="ic"><use href="#i-'+n+'"/></svg>'};
  window.IC={x:u('x'),back:u('back'),clip:u('clip'),dl:u('dl'),edit:u('edit'),trash:u('trash'),more:u('more'),out:u('out'),expand:u('expand'),heart:u('heart'),chat:u('chat')};
  window.avErr=function(i){var s=document.createElement('span');s.className=i.className;s.textContent=i.getAttribute('data-l')||'?';i.replaceWith(s)};

  function syncMeta(t){
    var m=document.querySelector('meta[name=theme-color]');
    if(m) m.setAttribute('content', t === 'light' ? '#f4f6f9' : (t === 'midnight' ? '#0b0f19' : '#000000'));
  }

  window.setAppTheme = function(t){
    var theme = (t === 'light' || t === 'midnight' || t === 'amoled') ? t : 'amoled';
    try{ localStorage.setItem('theme', theme); }catch(e){}
    document.documentElement.setAttribute('data-theme', theme);
    syncMeta(theme);
  };

  document.addEventListener('DOMContentLoaded', function(){
    syncMeta(document.documentElement.getAttribute('data-theme') || 'amoled');
  });
})();

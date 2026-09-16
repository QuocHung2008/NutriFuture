/* NutriFuture Homepage UX enhancement: smart search + quick discovery. */
(function(){'use strict';
  const chips=['Phở bò','Cơm tấm','Bún chả','Trứng','Sữa tươi'];
  function inject(){
    const page=document.querySelector('.page--home');
    const header=page&&page.querySelector('.page__header');
    if(!page||!header||page.querySelector('.home-smart-search')) return;
    const box=document.createElement('section');
    box.className='home-hero-audit';
    box.setAttribute('aria-labelledby','home-hero-title');
    box.innerHTML='<span class="home-hero-audit__eyebrow"><i class="fa-solid fa-sparkles" aria-hidden="true"></i> Din﻿h dưỡng thông minh cho học sinh</span><h2 id="home-hero-title" class="home-hero-audit__title">Ăn ngon, hiểu đúng, khỏe mỗi ngày.</h2><p class="home-hero-audit__desc">Tra cứu nhanh món ăn, chụp ảnh để AI phân tích hoặc mở nhật ký để theo dõi mục tiêu hôm nay.</p><form class="home-smart-search" id="home-smart-search" role="search"><label class="sr-only" for="home-smart-search-input">Tìm món ăn cần tra cứu</label><input id="home-smart-search-input" type="search" inputmode="search" autocomplete="off" placeholder="Tìm món ăn… ví dụ: phở bò, cơm gà"/><button type="submit"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Tra cứu AI</button></form><div class="home-smart-search__chips" aria-label="Gợi ý tìm kiếm"></div></section>';
    header.insertAdjacentElement('afterend',box);
    const chipsEl=box.querySelector('.home-smart-search__chips');
    chips.forEach(q=>{const b=document.createElement('button');b.type='button';b.className='home-smart-search__chip';b.textContent=q;b.addEventListener('click',()=>goLookup(q));chipsEl.appendChild(b)});
    box.querySelector('form').addEventListener('submit',e=>{e.preventDefault();goLookup(box.querySelector('input').value)});
  }
  function goLookup(value){const q=(value||'').trim();location.hash=q?'#lookup?query='+encodeURIComponent(q):'#lookup'}
  function routeHook(){setTimeout(inject,0)}
  window.addEventListener('hashchange',routeHook);document.addEventListener('DOMContentLoaded',routeHook);setTimeout(routeHook,250);
})();

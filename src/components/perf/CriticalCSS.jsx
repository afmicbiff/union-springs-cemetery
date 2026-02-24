import React, { memo } from 'react';

/**
 * CriticalCSS - Inlined critical styles for above-the-fold content
 * This eliminates render-blocking CSS for the initial paint
 */
const CriticalCSS = memo(function CriticalCSS() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      /* Critical CSS for above-the-fold content */
      
      /* Base reset - minimal */
      *,*::before,*::after{box-sizing:border-box}
      body{margin:0;line-height:1.5;-webkit-font-smoothing:antialiased}
      img,picture,video,canvas,svg{display:block;max-width:100%}
      
      /* Layout skeleton */
      .min-h-screen{min-height:100vh}
      .flex{display:flex}
      .flex-col{flex-direction:column}
      .items-center{align-items:center}
      .justify-center{justify-content:center}
      .justify-between{justify-content:space-between}
      .relative{position:relative}
      .absolute{position:absolute}
      .inset-0{inset:0}
      .z-10{z-index:10}
      .z-50{z-index:50}
      .overflow-hidden{overflow:hidden}
      .overflow-x-hidden{overflow-x:hidden}
      
      /* Spacing */
      .p-4{padding:1rem}
      .px-4{padding-left:1rem;padding-right:1rem}
      .py-8{padding-top:2rem;padding-bottom:2rem}
      .gap-4{gap:1rem}
      .space-y-4>:not([hidden])~:not([hidden]){margin-top:1rem}
      
      /* Typography */
      .text-center{text-align:center}
      .text-white{color:#fff}
      .text-stone-50{color:#fafaf9}
      .text-stone-100{color:#f5f5f4}
      .text-stone-300{color:#d6d3d1}
      .font-serif{font-family:Georgia,"Times New Roman",Times,serif}
      
      /* Background colors */
      .bg-stone-900{background-color:#1c1917}
      .bg-stone-100{background-color:#f5f5f4}
      .bg-teal-700{background-color:#0f766e}
      
      /* Buttons - critical */
      .rounded-sm{border-radius:0.125rem}
      .rounded-md{border-radius:0.375rem}
      .shadow-lg{box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1)}
      
      /* Hero section critical */
      .bg-cover{background-size:cover}
      .bg-center{background-position:center}
      
      /* Loading spinner */
      @keyframes spin{to{transform:rotate(360deg)}}
      .animate-spin{animation:spin 1s linear infinite}
      
      /* Prevent layout shift */
      .w-full{width:100%}
      .h-auto{height:auto}
      .max-w-xl{max-width:36rem}
      .max-w-7xl{max-width:80rem}
      .mx-auto{margin-left:auto;margin-right:auto}
      
      /* Header critical */
      .sticky{position:sticky}
      .top-0{top:0}
      .border-b-4{border-bottom-width:4px}
      .border-teal-700{border-color:#0f766e}
      .h-20{height:5rem}
      
      /* Mobile touch targets */
      .touch-manipulation{touch-action:manipulation}
      
      /* Reduce CLS for images — exclude hero LCP candidates */
      img:not([fetchpriority="high"]){content-visibility:auto}
      
      /* GPU acceleration hints */
      .will-change-transform{will-change:transform}
      
      /* Prefers reduced motion */
      @media(prefers-reduced-motion:reduce){
        *,*::before,*::after{
          animation-duration:0.01ms!important;
          animation-iteration-count:1!important;
          transition-duration:0.01ms!important;
        }
      }
    `}} />
  );
});

export default CriticalCSS;
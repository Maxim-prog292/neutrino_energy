(() => {
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d', { alpha: false });

    const base = document.createElement('canvas');
    const bctx = base.getContext('2d');
    const glow = document.createElement('canvas');
    const gctx = glow.getContext('2d');

    const colors = ['#c084fc','#a78bfa','#f472b6','#60a5fa','#e879f9'];

    let W = 0, H = 0, CX = 0, CY = 0;
    function resize() {
      W = Math.floor(innerWidth * DPR);
      H = Math.floor(innerHeight * DPR);
      for (const c of [canvas, base, glow]) {
        c.width = W; c.height = H;
        c.style.width = innerWidth + 'px';
        c.style.height = innerHeight + 'px';
      }
      CX = W * 0.5; CY = H * 0.5;
      ctx.fillStyle = '#05050a'; ctx.fillRect(0,0,W,H);
      bctx.fillStyle = 'rgba(0,0,0,1)'; bctx.fillRect(0,0,W,H);
      gctx.clearRect(0,0,W,H);
    }
    addEventListener('resize', resize, { passive: true });
    resize();

    const rnd = (a=0,b=1)=>a+Math.random()*(b-a);
    function noise2D(x,y){ const s=Math.sin(x*12.9898+y*78.233)*43758.5453; return s-Math.floor(s); }

    class Particle {
      constructor(i){ this.reset(i); }
      reset(i){
        const rSpread = 0.35 + noise2D(i,i*1.7)*0.75;
        this.baseR = 300*DPR * rSpread;
        this.angle = rnd(0, Math.PI*2);
        this.speed = (40/1000)*(0.6+Math.random()*0.8);
        this.spin = (Math.random()<0.5?-1:1)*(0.6+Math.random()*0.5);
        this.size = (0.7+Math.random()*1.2)*DPR;
        this.ecc = 0.1+Math.random()*0.45;
        this.hue = colors[(i + (Math.random()*colors.length)|0) % colors.length];
        this.x=CX; this.y=CY; this.tx=0; this.ty=0;
      }
      step(t, attract){
        const rNoise = 1+(noise2D(this.angle*0.5,t*0.0003)-0.5)*this.ecc*2.2;
        const r=this.baseR*rNoise;
        this.angle+=this.speed*this.spin;
        const cos=Math.cos(this.angle),sin=Math.sin(this.angle);
        const jitter=(noise2D(this.angle*3.1,t*0.001)-0.5)*8*DPR;
        const px=attract.x+cos*r+sin*r*0.08+jitter;
        const py=attract.y+sin*r+cos*r*0.08+jitter;
        this.tx=(this.tx+(-sin*0.6))*0.92;
        this.ty=(this.ty+(cos*0.6))*0.92;
        this.x=px+this.tx; this.y=py+this.ty;
      }
      draw(c){
        const r=this.size*(1.6+Math.random()*0.6);
        const g=c.createRadialGradient(this.x,this.y,0,this.x,this.y,r);
        g.addColorStop(0,this.hue);
        g.addColorStop(0.3,this.hue);
        g.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=g;
        c.beginPath(); c.arc(this.x,this.y,r,0,Math.PI*2); c.fill();
      }
    }

    class Dust {
      constructor(){ this.reset(true); }
      reset(initial=false){
        const angle=rnd(0,Math.PI*2);
        const dist=initial?rnd(4,60)*DPR:rnd(4,20)*DPR;
        this.x=CX+Math.cos(angle)*dist; this.y=CY+Math.sin(angle)*dist;
        this.vx=rnd(-0.5,0.5)*DPR; this.vy=rnd(-0.5,0.5)*DPR;
        this.life=rnd(500,1800);
        this.size=rnd(6,26)*DPR;
        this.hue=colors[(Math.random()*colors.length)|0];
      }
      step(attract){
        const ax=(attract.x-this.x)*0.0008;
        const ay=(attract.y-this.y)*0.0008;
        this.vx+=ax; this.vy+=ay;
        this.vx*=0.992; this.vy*=0.992;
        this.x+=this.vx; this.y+=this.vy;
        this.life-=16; if(this.life<=0) this.reset();
      }
      draw(c){
        const r=this.size;
        const g=c.createRadialGradient(this.x,this.y,0,this.x,this.y,r);
        g.addColorStop(0,this.hue);
        g.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=g;
        c.beginPath(); c.arc(this.x,this.y,r,0,Math.PI*2); c.fill();
      }
    }

    let particles=[], dust=[];
    function rebuild(){
      const n=900;
      particles=Array.from({length:n},(_,i)=>new Particle(i));
      dust=Array.from({length:Math.max(40,Math.floor(n*0.05))},()=>new Dust());
    }
    rebuild();

    const attract={x:CX,y:CY};

    addEventListener('contextmenu',e=>{
      e.preventDefault();
      const temp=document.createElement('canvas'); temp.width=W; temp.height=H;
      const tctx=temp.getContext('2d');
      tctx.drawImage(glow,0,0); tctx.drawImage(base,0,0);
      const url=temp.toDataURL('image/png');
      const a=document.createElement('a'); a.href=url; a.download='neon-particles.png'; a.click();
    });

    function frame(now){
      bctx.globalCompositeOperation='source-over';
      bctx.fillStyle='rgba(5,5,10,0.1)';
      bctx.fillRect(0,0,W,H);

      for(const d of dust){ d.step(attract); d.draw(bctx); }
      for(const p of particles){ p.step(now,attract); p.draw(bctx); }

      gctx.clearRect(0,0,W,H);
      gctx.globalCompositeOperation='source-over';
      gctx.filter='blur(20px)'; gctx.drawImage(base,0,0);
      gctx.filter='blur(8px)'; gctx.globalCompositeOperation='lighter'; gctx.drawImage(base,0,0);
      gctx.filter='none';

      ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='#05050a'; ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation='lighter';
      ctx.drawImage(glow,0,0); ctx.drawImage(base,0,0);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();
"""
Generate the 35 ViewNam social designs using the fb-22-v2 'premium photo poster' pattern.
Reads from a curated content map; writes designs/fb-XX-*.html files.

Run: python generate_designs.py
"""
from pathlib import Path

# Pattern shared CSS (same as fb-22-v2 final state)
SHARED_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;0,800;0,900;1,400;1,700;1,900&display=swap" rel="stylesheet">
<title>{title}</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  :root{{--green-deep:#062A1F;--green-mid:#0B3D2C;--green-bright:#2EA876;--gold:#D4A843;--cream:#F5EFDE}}
  body{{width:1080px;height:1080px;overflow:hidden;font-family:'Inter',sans-serif;background:#000;color:var(--cream);position:relative}}

  .photo{{position:absolute;inset:0;background:url('../images/{photo}') {pos} / cover no-repeat;filter:saturate(0.96) contrast(1.06) brightness(1.06);z-index:1}}
  .vignette{{position:absolute;inset:0;background:radial-gradient(ellipse 95% 95% at 60% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.20) 78%, rgba(0,0,0,0.38) 100%);z-index:2;pointer-events:none}}
  .anchor{{position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,42,31,0.94) 0%,rgba(11,61,44,0.78) 18%,rgba(11,61,44,0.38) 32%,rgba(11,61,44,0) 46%),linear-gradient(125deg,rgba(11,61,44,0.94) 0%,rgba(11,61,44,0.82) 22%,rgba(11,61,44,0.45) 45%,rgba(11,61,44,0.12) 65%,rgba(11,61,44,0) 82%);z-index:3;pointer-events:none}}
  .shine{{position:absolute;inset:0;background:radial-gradient(ellipse 62% 50% at 22% 60%, rgba(46,168,118,0.58) 0%, rgba(46,168,118,0.30) 28%, rgba(46,168,118,0.10) 55%, rgba(46,168,118,0) 75%);z-index:4;pointer-events:none}}
  .grain{{position:absolute;inset:0;background-image:radial-gradient(rgba(212,168,67,0.06) 1px, transparent 1px);background-size:32px 32px;opacity:0.55;z-index:5;pointer-events:none}}

  .shield{{position:absolute;top:70px;right:70px;z-index:8;filter:drop-shadow(0 4px 20px rgba(0,0,0,0.55))}}
  .shield img{{height:66px;display:block}}
  .top-mast{{position:absolute;top:88px;left:90px;z-index:7;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;letter-spacing:3.4px;text-transform:uppercase;color:rgba(245,239,222,0.7)}}
  .top-mast .dot{{color:var(--gold);margin:0 12px;opacity:0.8}}

  .content{{position:absolute;left:90px;bottom:130px;right:120px;z-index:7;max-width:760px}}
  .cat{{font-family:'Inter',sans-serif;font-size:12px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:var(--gold);margin-bottom:36px}}
  .cat::before{{content:'';display:inline-block;width:38px;height:1px;background:var(--gold);vertical-align:middle;margin-right:18px;margin-top:-4px}}
  h1{{font-family:'Playfair Display',serif;font-weight:700;font-size:{h1_size}px;line-height:0.94;letter-spacing:-2.6px;color:#fff;margin-bottom:0;text-shadow:0 2px 24px rgba(0,0,0,0.45)}}
  h1 .it,h1 .a{{font-style:italic;font-weight:700;color:var(--gold)}}
  h1 q{{quotes:'\\201C' '\\201D';font-style:italic;font-weight:700}}
  h1 em{{font-style:italic;font-weight:700;color:var(--gold)}}
  .rule{{width:48px;height:1px;background:var(--gold);margin:42px 0 30px;opacity:0.95}}
  .lede{{font-family:'Playfair Display',serif;font-style:italic;font-weight:400;font-size:25px;line-height:1.55;color:#fff;max-width:620px;letter-spacing:-0.2px;text-shadow:0 1px 14px rgba(0,0,0,0.65)}}
  .lede em{{font-style:normal;font-weight:700;color:var(--gold)}}
  .lede b{{color:#fff;font-weight:700;font-style:italic}}

  .footer{{position:absolute;bottom:54px;left:90px;right:90px;z-index:7;display:flex;justify-content:space-between;align-items:center}}
  .meta{{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;letter-spacing:3.2px;text-transform:uppercase;color:rgba(245,239,222,0.8)}}
  .meta span{{color:var(--gold);margin:0 12px;opacity:0.7}}
  .url{{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;letter-spacing:3.2px;text-transform:uppercase;color:rgba(245,239,222,0.8)}}
{extra_css}
</style>
</head>
<body>
  <div class="photo"></div>
  <div class="vignette"></div>
  <div class="anchor"></div>
  <div class="shine"></div>
  <div class="grain"></div>
  <div class="shield"><img src="../images/ViewNam logo white.png" alt="ViewNam"></div>
  <div class="top-mast">ViewNam <span class="dot">&middot;</span> Vehicle Inspection</div>
{body}
  <div class="footer">
    <div class="meta">{meta}</div>
    <div class="url">www.viewnam.com</div>
  </div>
</body>
</html>
"""

def standard_body(cat, h1, lede):
    return f"""  <div class="content">
    <div class="cat">{cat}</div>
    <h1>{h1}</h1>
    <div class="rule"></div>
    <div class="lede">{lede}</div>
  </div>"""

def menu_body(cat, h1, items):
    extra = """
  .menu{display:flex;flex-direction:column;gap:0;border-top:1px solid rgba(212,168,67,0.30);max-width:680px;margin-top:30px}
  .item{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:baseline;padding:11px 0;border-bottom:1px solid rgba(212,168,67,0.30)}
  .item .name{font-family:'Playfair Display',serif;font-weight:700;font-size:20px;letter-spacing:-0.3px;color:#fff;line-height:1.2}
  .item .desc{font-family:'Playfair Display',serif;font-style:italic;font-size:13px;color:rgba(245,239,222,0.75);line-height:1.35;max-width:480px;margin-top:2px}
  .item .price{font-family:'Playfair Display',serif;font-weight:800;font-size:26px;color:var(--gold);letter-spacing:-0.4px;white-space:nowrap}
  .item.hero .name::after{content:' \\00B7 Recommended';font-family:'Playfair Display',serif;font-style:italic;font-weight:400;font-size:13px;color:var(--gold);margin-left:4px}"""
    items_html = '\n    '.join(items)
    body = f"""  <div class="content" style="bottom:90px;max-width:780px">
    <div class="cat">{cat}</div>
    <h1 style="font-size:60px">{h1}</h1>
    <div class="menu">
    {items_html}
    </div>
  </div>"""
    return body, extra

def steps_body(cat, h1, steps):
    extra = """
  .steps{display:flex;flex-direction:column;gap:8px;margin-top:30px;max-width:640px}
  .step{display:grid;grid-template-columns:60px 1fr;gap:18px;align-items:baseline;padding:14px 0;border-top:1px solid rgba(212,168,67,0.28)}
  .step:last-child{border-bottom:1px solid rgba(212,168,67,0.28)}
  .step .n{font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:28px;color:var(--gold)}
  .step h3{font-family:'Playfair Display',serif;font-weight:700;font-size:24px;color:#fff;line-height:1.2;margin-bottom:3px;letter-spacing:-0.3px}
  .step p{font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:rgba(245,239,222,0.85);line-height:1.4}"""
    steps_html = '\n    '.join(steps)
    body = f"""  <div class="content">
    <div class="cat">{cat}</div>
    <h1>{h1}</h1>
    <div class="steps">
    {steps_html}
    </div>
  </div>"""
    return body, extra

def cities_body(cat, h1, cities_html):
    extra = """
  .cities{font-family:'Playfair Display',serif;font-style:italic;font-weight:400;font-size:23px;line-height:1.55;color:#fff;max-width:680px;text-shadow:0 1px 14px rgba(0,0,0,0.65);margin-top:32px}
  .cities b{font-weight:700;font-style:italic;color:#fff}
  .cities .more{display:block;color:var(--gold);font-style:italic;font-size:18px;margin-top:14px;opacity:0.9}"""
    body = f"""  <div class="content">
    <div class="cat">{cat}</div>
    <h1>{h1}</h1>
    <div class="rule"></div>
    <div class="cities">{cities_html}</div>
  </div>"""
    return body, extra

def quote_body(cat, quote, cite):
    extra = """
  .quote{font-family:'Playfair Display',serif;font-style:italic;font-weight:400;font-size:42px;line-height:1.25;color:#fff;letter-spacing:-0.6px;text-shadow:0 2px 18px rgba(0,0,0,0.6);max-width:760px}
  .quote::before{content:'\\201C';font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:120px;color:var(--gold);line-height:0.4;display:block;margin-bottom:8px}
  .quote b{font-weight:700;font-style:italic;color:var(--gold)}
  .cite{font-family:'Inter',sans-serif;font-size:12px;font-weight:700;letter-spacing:3.2px;text-transform:uppercase;color:rgba(245,239,222,0.85);margin-top:36px}
  .cite span{color:var(--gold);margin:0 12px;opacity:0.8}"""
    body = f"""  <div class="content">
    <div class="cat">{cat}</div>
    <div class="quote">{quote}</div>
    <div class="cite">{cite}</div>
  </div>"""
    return body, extra

# ---------------------------------------------------------------------
# Master design configuration: photo, position, content, meta tagline
# ---------------------------------------------------------------------
DESIGNS = [
    # 01
    dict(file='fb-01-shocking-stat.html', title='FB 01 — Seven in Ten',
         photo='Background%20Images/pexels-introspectivedsgn-12700827.jpg', pos='30% center',
         cat='The Hidden Truth',
         h1='<span class="it">7</span><span style="color:#fff">/</span><span class="it">10</span> used cars have<br>hidden faults.',
         lede='Most buyers only discover them <em>after</em> they\'ve paid.',
         meta='Hidden faults <span>·</span> Surface tests <span>·</span> OBD'),
    # 02
    dict(file='fb-02-cost-math.html', title='FB 02 — Cost Math',
         photo='Background%20Images/pexels-introspectivedsgn-5438618.jpg', pos='center center',
         cat='The Real Math',
         h1='Pay the small bill.<br><span class="it">Or the large one.</span>',
         lede='An inspection costs less than one tow. <em>And far less than one regret.</em>',
         meta='Inspect <span>·</span> Verify <span>·</span> Decide'),
    # 03
    dict(file='fb-03-red-flags.html', title='FB 03 — Red Flags',
         photo='Background%20Images/pexels-talal-5403208.jpg', pos='center center',
         cat='Red Flags',
         h1='Five things a seller<br><span class="it">hopes you\'ll miss.</span>',
         lede='A repaint over rust. A reset odometer. A cleared engine code. A re-sprayed VIN. <em>The smile that hides them.</em>',
         meta='Body <span>·</span> Engine <span>·</span> Papers <span>·</span> Drive'),
    # 04
    dict(file='fb-04-natis-codes.html', title='FB 04 — NaTIS Codes',
         photo='Background%20Images/pexels-ekaterina-bolovtsova-6077777.jpg', pos='center center',
         cat='The NaTIS Guide',
         h1='Read the code<br><span class="it">before you read the price.</span>',
         lede='Code 1 — never damaged. Code 2 — used. <em>Code 3 — written off.</em> Code 4 — permanently demolished.',
         meta='Code 1 <span>·</span> Code 2 <span>·</span> Code 3 <span>·</span> Code 4'),
    # 05  STEPS
    dict(file='fb-05-how-it-works.html', title='FB 05 — How It Works',
         photo='Background%20Images/mehmet-talha-onuk-6AbkEt7-lCA-unsplash.jpg', pos='38% center',
         cat='The Process',
         h1='Simple. Safe.<br><span class="it">Smart.</span>',
         steps=[
             '<div class="step"><div class="n">i.</div><div><h3>You book online</h3><p>Two minutes. Tell us the car, the seller, the town.</p></div></div>',
             '<div class="step"><div class="n">ii.</div><div><h3>Our inspector visits the seller</h3><p>A full, methodical check — same day where possible.</p></div></div>',
             '<div class="step"><div class="n">iii.</div><div><h3>You get the honest report</h3><p>Photos, verdict, advice — straight to your phone.</p></div></div>',
         ],
         meta='Book <span>·</span> Inspect <span>·</span> Decide'),
    # 06
    dict(file='fb-06-what-we-check.html', title='FB 06 — What We Check',
         photo='Background%20Images/pexels-cottonbro-4489707.jpg', pos='center center',
         cat='The Inspection',
         h1='<span class="it">140+</span> checks.<br>Every visit.',
         lede='Body, paint, panels, glass, tyres, brakes, suspension, engine, OBD, papers, VIN, test drive. <em>One inspection. One honest report.</em> Nothing skipped.',
         meta='Body <span>·</span> Engine <span>·</span> OBD <span>·</span> Drive'),
    # 07
    dict(file='fb-07-buyer-first.html', title='FB 07 — Buyer First',
         photo='Background%20Images/pexels-gustavo-fring-4173189.jpg', pos='center center',
         cat='Who We Work For',
         h1='We work for<br>the <span class="it">buyer.</span>',
         lede='The seller didn\'t hire us. <em>You did.</em> That\'s why we tell you the truth — even when it means walking away.',
         meta='Independent <span>·</span> Honest <span>·</span> Buyer-side'),
    # 08  CITIES
    dict(file='fb-08-nationwide.html', title='FB 08 — Nationwide',
         photo='Background%20Images/pexels-proudlyswazi-37087828.jpg', pos='center center',
         cat='Coverage',
         h1='Wherever the car is,<br><span class="it">we go there.</span>',
         cities='<b>Windhoek. Swakopmund. Walvis Bay.</b> Oshakati, Ondangwa, Ongwediva. <b>Otjiwarongo. Tsumeb. Gobabis.</b> Rundu, Katima Mulilo, Keetmanshoop. <b>Mariental. Lüderitz.</b><span class="more">— and wherever else the car may be.</span>',
         meta='Nationwide <span>·</span> Local inspectors <span>·</span> Same-day'),
    # 09
    dict(file='fb-09-question.html', title='FB 09 — Simple Question',
         photo='Background%20Images/pexels-silverkblack-36729880.jpg', pos='center center',
         cat='A Simple Question',
         h1='Would you buy a house<br>without <span class="it">looking inside?</span>',
         lede='Obviously not. So why buy a used car on the seller\'s word alone, and spend months fixing what nobody told you about? <em>An inspection costs less than one repair.</em>',
         meta='Look <span>·</span> Verify <span>·</span> Then commit'),
    # 10
    dict(file='fb-10-mission.html', title='FB 10 — Mission',
         photo='Background%20Images/pexels-gustavo-fring-6870317.jpg', pos='center center',
         cat='Why We Built It',
         h1='Too many Namibians<br>have been <span class="it">burned.</span>',
         lede='ViewNam exists for one reason: <em>so it stops happening.</em> A buyer-side inspection, anywhere in the country, without favours to the seller.',
         meta='For Namibian buyers <span>·</span> Independent <span>·</span> Honest'),
    # 11
    dict(file='fb-11-seller-lies.html', title='FB 11 — Seller Lies',
         photo='Background%20Images/pexels-cottonbro-8387961.jpg', pos='center center',
         cat='Things Sellers Say',
         h1='Four sentences<br>worth <span class="it">verifying.</span>',
         lede='<em>"It\'s never been in an accident."</em> <em>"The mileage is genuine."</em> <em>"The papers are in order."</em> <em>"It just needs a service."</em> Every one of them is testable.',
         meta='Test <span>·</span> Verify <span>·</span> Trust the report'),
    # 12
    dict(file='fb-12-code3-story.html', title='FB 12 — Code 3 BMW',
         photo='Background%20Images/pexels-introspectivedsgn-4732671.jpg', pos='center center',
         cat='A Real Scenario',
         h1='He almost bought<br>a <span class="it">Code 3 BMW.</span>',
         lede='Listed at N$215,000. Fresh paint. Friendly seller. <em>Our NaTIS check showed: written off in 2019.</em> The buyer walked. The deposit never left his account.',
         meta='Code 3 = written off <span>·</span> Always check'),
    # 13
    dict(file='fb-13-from-your-couch.html', title='FB 13 — From Your Couch',
         photo='Background%20Images/pexels-mikhail-nilov-9301473.jpg', pos='center center',
         cat='Save The Trip',
         h1='We drive.<br><span class="it">You decide.</span>',
         lede='Buying a car in another town? A local ViewNam inspector checks it for you. <em>Photos, report, verdict — straight to your phone.</em>',
         meta='Remote-friendly <span>·</span> Nationwide <span>·</span> Same-day'),
    # 14
    dict(file='fb-14-family-savings.html', title='FB 14 — Family Savings',
         photo='Background%20Images/pexels-silverkblack-36730225.jpg', pos='center center',
         cat='A Family\'s Biggest Purchase',
         h1='Your family\'s savings<br>are <span class="it">on the line.</span>',
         lede='A car is often the second-largest purchase a household makes. <em>Don\'t buy blind. Buy protected.</em>',
         meta='Protect the savings <span>·</span> Inspect first'),
    # 15
    dict(file='fb-15-imports.html', title='FB 15 — Imports',
         photo='Background%20Images/pexels-efrem-efre-2786187-14681388.jpg', pos='center center',
         cat='The Import Question',
         h1='Every import<br>arrives with <span class="it">a past.</span>',
         lede='Japan, South Africa, the UAE, the UK. The paperwork clears the port — <em>the real history doesn\'t always travel with it.</em>',
         meta='Imports <span>·</span> Verify the history'),
    # 16
    dict(file='fb-16-cousin.html', title='FB 16 — Cousin',
         photo='Background%20Images/pexels-abasiakan-255745439-12555016.jpg', pos='center center',
         cat='Some Help Isn\'t Enough',
         h1='<q>My cousin knows cars</q><br>is <em>not a plan.</em>',
         lede='Goodwill doesn\'t spot a tampered VIN. It doesn\'t read a NaTIS printout. <em>It doesn\'t write a report you can hold to a seller.</em>',
         meta='Trained <span>·</span> Equipped <span>·</span> Accountable'),
    # 17  MENU
    dict(file='fb-17-pricing.html', title='FB 17 — Pricing',
         photo='Background%20Images/pexels-shkrabaanthony-7144184.jpg', pos='center center',
         cat='Transparent Pricing',
         h1='Pay only for<br><span class="it">what you need.</span>',
         menu_items=[
             '<div class="item hero"><div><div class="name">Full Inspection</div><div class="desc">Inside, outside, engine, OBD, test drive · 50+ photos &amp; video · verdict.</div></div><div class="price">N$1,200</div></div>',
             '<div class="item"><div><div class="name">Basic Visual Check</div><div class="desc">Body, interior, tyres, visible damage · 20+ photos.</div></div><div class="price">N$600</div></div>',
             '<div class="item"><div><div class="name">Engine &amp; Mechanical</div><div class="desc">Engine bay, brakes, suspension, OBD scan, fluids.</div></div><div class="price">N$600</div></div>',
             '<div class="item"><div><div class="name">Test Drive Check</div><div class="desc">Cold start, gearbox, brakes, road behaviour.</div></div><div class="price">N$500</div></div>',
             '<div class="item"><div><div class="name">Basic + Engine Combo</div><div class="desc">Visual &amp; mechanical in one visit — saves N$200.</div></div><div class="price">N$1,000</div></div>',
             '<div class="item"><div><div class="name">Peace of Mind Check</div><div class="desc">Photos, odometer &amp; quick walkaround video.</div></div><div class="price">N$350</div></div>',
         ],
         meta='No hidden fees <span>·</span> No surprises'),
    # 18
    dict(file='fb-18-checks-buyers-skip.html', title='FB 18 — Checks Buyers Skip',
         photo='Background%20Images/pexels-artempodrez-8985605.jpg', pos='center center',
         cat='Before You Pay',
         h1='Five checks<br>most buyers <span class="it">skip.</span>',
         lede='OBD scan. Frame integrity. VIN match. NaTIS status. Test drive under load. <em>The five that prevent the most regret.</em>',
         meta='OBD <span>·</span> Frame <span>·</span> VIN <span>·</span> NaTIS'),
    # 19
    dict(file='fb-19-what-sellers-hide.html', title='FB 19 — What Sellers Hide',
         photo='Background%20Images/pexels-cottonbro-3206082.jpg', pos='center center',
         cat='The Unmentioned',
         h1='The fee below<br>the asking <span class="it">price.</span>',
         lede='Every used car hides a second invoice. <em>We read it</em> before you sign the first.',
         meta='See it before you sign'),
    # 20
    dict(file='fb-20-first-car.html', title='FB 20 — First Car',
         photo='Background%20Images/pexels-victor-chijioke-350220031-20758455.jpg', pos='center center',
         cat='First-Time Buyer',
         h1='Your first car<br>shouldn\'t be<br>your <span class="it">first regret.</span>',
         lede='Excitement rushes the decision. <em>We step in between the excitement and the signature.</em>',
         meta='First-time <span>·</span> Verified <span>·</span> Confident'),
    # 21
    dict(file='fb-21-the-report.html', title='FB 21 — The Report',
         photo='Background%20Images/pexels-gustavo-fring-6870326.jpg', pos='center center',
         cat='The Deliverable',
         h1='What you actually<br><span class="it">receive.</span>',
         lede='50+ photos. Walkaround video. OBD scan. NaTIS status. Engine, body, drive verdict. <em>One PDF you can hold to the seller.</em>',
         meta='Photos <span>·</span> Video <span>·</span> Verdict <span>·</span> PDF'),
    # 22 — already final, regenerate using template
    dict(file='fb-22-inspectors.html', title='FB 22 — The Inspectors',
         photo='Background%20Images/pexels-gustavo-fring-6870298.jpg', pos='62% center',
         cat='The People',
         h1='Real people.<br><span class="it">Real expertise.</span>',
         lede='Every ViewNam inspector is vetted, trained, and based in the town you\'re buying in — brand specialists for BMW, VW, Toyota, Mercedes-Benz and more.',
         meta='Trained <span>·</span> Vetted <span>·</span> Local <span>·</span> Brand-specialised'),
    # 23
    dict(file='fb-23-no-commission.html', title='FB 23 — No Commission',
         photo='Background%20Images/pexels-shkrabaanthony-7144204.jpg', pos='center center',
         cat='Our Promise',
         h1='We accept <span class="it">nothing</span><br>from the seller.',
         lede='No commissions. No dealer relationships. No quiet fees. <em>The moment we do, we stop working for you.</em>',
         meta='No commissions <span>·</span> No dealer fees'),
    # 24
    dict(file='fb-24-same-day.html', title='FB 24 — Same Day',
         photo='Background%20Images/pexels-gustavo-fring-6870305.jpg', pos='center center',
         cat='Speed',
         h1='One call.<br>One visit.<br><span class="it">One verdict.</span>',
         lede='Same-day inspections where possible. <em>The deal waits for no one — and neither do we.</em>',
         meta='Same-day <span>·</span> Nationwide <span>·</span> Booked online'),
    # 25
    dict(file='fb-25-walk-away.html', title='FB 25 — Walk Away',
         photo='Background%20Images/pexels-gustavo-fring-4173090.jpg', pos='center center',
         cat='Our Integrity',
         h1='Sometimes we say<br><span class="it">don\'t buy it.</span>',
         lede='A ViewNam inspection isn\'t a certificate of approval. <em>It\'s an honest verdict.</em> Sometimes that verdict is no.',
         meta='Honest <span>·</span> Buyer-side <span>·</span> No favours'),
    # 26
    dict(file='fb-26-negotiate.html', title='FB 26 — Negotiate',
         photo='Background%20Images/pexels-silverkblack-36730205.jpg', pos='center center',
         cat='The Negotiation',
         h1='Our report can save you<br><span class="it">N$10,000+</span><br>off the asking price.',
         lede='A written list of genuine faults is the strongest negotiation tool a buyer can hold. <em>Sellers respect paperwork they can\'t argue with.</em>',
         meta='Documented <span>·</span> Defensible <span>·</span> Bankable'),
    # 27
    dict(file='fb-27-marketplace.html', title='FB 27 — Marketplace',
         photo='Background%20Images/pexels-wealththecreator-10959916.jpg', pos='center center',
         cat='Marketplace Buyers',
         h1='Found it on <span class="it">Facebook<br>Marketplace?</span>',
         lede='Private sales are where the smoothest deals — and the nastiest surprises — live. <em>Send us the listing. We\'ll go check.</em>',
         meta='Marketplace <span>·</span> Private sale <span>·</span> Verified'),
    # 28
    dict(file='fb-28-obd-scan.html', title='FB 28 — OBD Scan',
         photo='Background%20Images/pexels-lumierestudiomx-4116193.jpg', pos='center center',
         cat='Beyond The Visible',
         h1='The car\'s computer<br>doesn\'t <span class="it">lie.</span>',
         lede='Our OBD scanner reads what the engine has recorded — long after the dashboard lights have been cleared. <em>Stored faults still show.</em>',
         meta='OBD <span>·</span> Stored faults <span>·</span> History'),
    # 29  QUOTE
    dict(file='fb-29-testimonial.html', title='FB 29 — Testimonial',
         photo='Background%20Images/pexels-shkrabaanthony-7144189.jpg', pos='center center',
         cat='Client Voice',
         quote='The report showed faults <b>I would\'ve never found myself.</b> The seller suddenly dropped the price. ViewNam saved me real money — and a lot of regret.',
         cite='M. N. <span>·</span> Windhoek <span>·</span> VW Polo buyer',
         meta='Real booking <span>·</span> Real saving'),
    # 30
    dict(file='fb-30-second-opinion.html', title='FB 30 — Second Opinion',
         photo='Background%20Images/pexels-gustavo-fring-4895408.jpg', pos='center center',
         cat='Still Unsure?',
         h1='Get the<br><span class="it">second opinion</span><br>that matters.',
         lede='Already seen the car? Already negotiated? Before the signature — <em>let us verify what the seller told you.</em>',
         meta='Verify before you sign'),
    # 31
    dict(file='fb-31-thinking-of-buying.html', title='FB 31 — Thinking Of Buying',
         photo='Background%20Images/pexels-salomonjr10-6650893.jpg', pos='35% center',
         cat='Before You Decide',
         h1='Thinking of<br>buying <span class="it">a car?</span>',
         lede='You\'re already ahead of most buyers — because you\'re reading this <em>before</em> you\'ve paid. One inspection can save you thousands. <em>Don\'t risk it.</em>',
         meta='Avoid costly mistakes <span>·</span> Inspect first'),
    # 32
    dict(file='fb-32-before-you-call.html', title='FB 32 — Before You Call',
         photo='Background%20Images/worried%20man%20phone%201.jpg', pos='center center',
         cat='The Smart Order',
         h1='Before you call<br><span class="it">the seller —</span><br>call us.',
         lede='Found a car you like? Send us the details. <em>We\'ll check it before you even set foot there.</em> No wasted trips. No staged drives.',
         meta='Call us first <span>·</span> Save the trip'),
    # 33
    dict(file='fb-33-looks-good.html', title='FB 33 — Looks Good',
         photo='Background%20Images/pexels-kasperphotography-999001.jpg', pos='center center',
         cat='Beneath The Surface',
         h1='The car<br>looks <span class="it">good.</span><br>But is it?',
         lede='A fresh polish and a warm smile can hide thousands in damage. <em>We look where the eye doesn\'t.</em>',
         meta='Surface <span>·</span> Frame <span>·</span> Engine <span>·</span> Papers'),
    # 34
    dict(file='fb-34-every-buyer-wishes.html', title='FB 34 — Every Buyer Wishes',
         photo='Background%20Images/Worried%20Man%20Phone%20Car%20Breakdown.jpg', pos='center center',
         cat='Hindsight',
         h1='Every Namibian<br>who bought a car<br>wishes they <span class="it">knew this.</span>',
         lede='An inspection costs less than one tow. <em>You\'re still in time to do what they wish they had.</em>',
         meta='Don\'t be the lesson <span>·</span> Be the buyer who checked'),
    # 35
    dict(file='fb-35-check-not-deposit.html', title='FB 35 — Check First',
         photo='Background%20Images/pexels-mart-production-8869361.jpg', pos='center center',
         cat='The Right Order',
         h1='Start with<br>the <span class="it">check.</span><br>Not the deposit.',
         lede='A deposit locks you in. A report sets you free. <em>Do them in the right order.</em>',
         meta='Check <span>·</span> Then deposit'),
    # 36 — Cost reversal: tiny inspection vs. catastrophic mistake
    dict(file='fb-36-tiny-cost.html', title='FB 36 — Tiny Cost',
         photo='Background%20Images/pexels-silverkblack-36812487.jpg', pos='center center',
         cat='The Math That Matters',
         h1='N$1,200 today.<br>Or <span class="it">N$200,000</span><br>tomorrow.',
         lede='An inspection is the cheapest decision in the entire process. <em>The mistake it prevents is the most expensive one.</em>',
         meta='Cheapest decision <span>·</span> Biggest protection'),
    # 37 — Insurance gap
    dict(file='fb-37-insurance-gap.html', title='FB 37 — Insurance Gap',
         photo='Background%20Images/pexels-karola-g-4506212.jpg', pos='center center',
         cat='Beyond Insurance',
         h1='Insurance won\'t cover<br>what we\'d have <span class="it">caught.</span>',
         lede='Mechanical wear. Undisclosed damage. Cleared engine codes. <em>Insurance pays for accidents — not for what you bought broken.</em>',
         meta='Inspect first <span>·</span> Insure second'),
    # 38 — Dealer inspection conflict
    dict(file='fb-38-dealer-conflict.html', title='FB 38 — Dealer Conflict',
         photo='Background%20Images/pexels-shkrabaanthony-7144261.jpg', pos='center center',
         cat='Independence Matters',
         h1='When the dealer<br>does the <span class="it">inspection,</span><br>who works for you?',
         lede='Independent means we earn nothing if you buy. <em>Our only loyalty is to the verdict.</em>',
         meta='Independent <span>·</span> Buyer-side <span>·</span> Honest'),
    # 39 — 4 minutes
    dict(file='fb-39-four-minutes.html', title='FB 39 — Four Minutes',
         photo='Background%20Images/worried%20man%20phone%204.jpg', pos='center center',
         cat='Save Months. Lose Minutes.',
         h1='Four minutes<br>to <span class="it">book.</span><br>Months saved<br>in regret.',
         lede='Booking takes less time than the test drive itself. <em>The regret it prevents lasts years.</em>',
         meta='Two minutes <span>·</span> One verdict'),
    # 40 — Caveat emptor reframed
    dict(file='fb-40-caveat-emptor.html', title='FB 40 — Caveat Emptor',
         photo='Background%20Images/pexels-pavel-danilyuk-8425388.jpg', pos='center center',
         cat='Caveat Emptor',
         h1='Buyer beware.<br><span class="it">Until now.</span>',
         lede='Two thousand years of Latin advice — finally with a Namibian solution. <em>Inspect before you commit.</em>',
         meta='Ancient warning <span>·</span> Modern remedy'),
    # 41 — 50 photos / one verdict
    dict(file='fb-41-fifty-photos.html', title='FB 41 — Fifty Photos',
         photo='Background%20Images/pexels-pavel-danilyuk-8425407.jpg', pos='center center',
         cat='What You Receive',
         h1='50 photos.<br>One <span class="it">verdict.</span><br>Zero guesswork.',
         lede='Photos prove what we saw. <em>The verdict tells you what to do about it.</em> One PDF you can hold to the seller.',
         meta='Photos <span>·</span> Video <span>·</span> Verdict <span>·</span> PDF'),
    # 42 — Three things never to trust
    dict(file='fb-42-never-trust.html', title='FB 42 — Never Trust',
         photo='Background%20Images/pexels-silverkblack-36729859.jpg', pos='center center',
         cat='Don\'t Take Their Word',
         h1='Never trust a seller\'s<br><span class="it">word</span> on these three.',
         lede='Service history. Accident history. Mileage. <em>Three claims that are easy to make — and impossible to prove without us.</em>',
         meta='Service <span>·</span> Accidents <span>·</span> Mileage'),
    # 43 — Average savings
    dict(file='fb-43-average-saved.html', title='FB 43 — Average Saved',
         photo='Background%20Images/pexels-tochukwu-ekeh-2149052634-33500979.jpg', pos='center center',
         cat='What Buyers Save',
         h1='Average ViewNam buyer<br>saves <span class="it">N$8,400.</span>',
         lede='Either in negotiation, in avoided repairs, or in a deal walked away from. <em>The inspection pays for itself nine times out of ten.</em>',
         meta='Negotiate <span>·</span> Avoid <span>·</span> Walk away'),
    # 44 — 5 minutes vs 5 years
    dict(file='fb-44-walkaround.html', title='FB 44 — Walkaround',
         photo='Background%20Images/pexels-lumierestudiomx-4116172.jpg', pos='center center',
         cat='Surface vs. Substance',
         h1='A 5-minute walkaround<br>misses <span class="it">5 years</span><br>of damage.',
         lede='Eyes can\'t see frame welds. Hands can\'t feel cleared engine codes. <em>We use the tools that do.</em>',
         meta='Frame <span>·</span> Welds <span>·</span> Codes <span>·</span> Truth'),
    # 45 — Ask the car
    dict(file='fb-45-ask-the-car.html', title='FB 45 — Ask The Car',
         photo='Background%20Images/pexels-gustavo-fring-6870313.jpg', pos='center center',
         cat='Direct Source',
         h1='Don\'t ask the seller.<br>Ask the <span class="it">car.</span>',
         lede='The OBD port doesn\'t lie. The VIN plate doesn\'t get evasive. The frame welds don\'t deflect. <em>We let the car speak for itself.</em>',
         meta='OBD <span>·</span> VIN <span>·</span> Frame <span>·</span> Truth'),
]

# ---------------------------------------------------------------------
def render(d):
    h1_size = 96
    extra_css = ''
    # Choose body variant
    if 'menu_items' in d:
        body, extra_css = menu_body(d['cat'], d['h1'], d['menu_items'])
    elif 'steps' in d:
        body, extra_css = steps_body(d['cat'], d['h1'], d['steps'])
    elif 'cities' in d:
        body, extra_css = cities_body(d['cat'], d['h1'], d['cities'])
    elif 'quote' in d:
        body, extra_css = quote_body(d['cat'], d['quote'], d['cite'])
    else:
        # Auto-shrink for very long headlines
        h1_text = d['h1']
        line_count = h1_text.count('<br>') + 1
        if line_count >= 3:
            h1_size = 80
        body = standard_body(d['cat'], d['h1'], d['lede'])

    return SHARED_HEAD.format(
        title=d['title'],
        photo=d['photo'],
        pos=d['pos'],
        h1_size=h1_size,
        extra_css=extra_css,
        body=body,
        meta=d['meta'],
    )

if __name__ == '__main__':
    out_dir = Path('designs')
    written = 0
    for d in DESIGNS:
        path = out_dir / d['file']
        path.write_text(render(d), encoding='utf-8')
        written += 1
    print(f'Generated {written} designs')

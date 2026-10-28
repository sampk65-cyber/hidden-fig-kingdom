const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../castle/vip.js');
const UI=new Proxy({}, {get:(_,key)=>require(file)[key]});
{
 const card={id:'test-card',levelId:'tower-01',levelTitle:'流光晶塔',thumbnail:'art/castle/tower-01-thumb.webp',serial:'T01-001',serialNumber:1,editionLimit:100,memberNo:'MEM001',name:'測試會員',role:'hero',points:300,issuedAt:1800000000000,prize:{status:'pending',name:'',note:''},rtok:'SECRET_LOGIN_TOKEN',uid:'PRIVATE_UID'};
 test('VIP combines member identity, unique edition and level thumbnail',()=>{const html=UI.cardHTML(card);for(const value of ['MEM001','測試會員','T01-001','100','tower-01-thumb.webp','流光晶塔'])assert.ok(html.includes(value),value)});
 test('card and download fields omit login secrets even if supplied',()=>{const html=UI.cardHTML(card),model=UI.cardModel(card);assert.ok(!html.includes('SECRET_LOGIN_TOKEN'));assert.ok(!JSON.stringify(model).includes('SECRET_LOGIN_TOKEN'));assert.ok(!JSON.stringify(model).includes('PRIVATE_UID'));assert.equal(model.memberNo,'MEM001')});
 test('member and award text cannot inject HTML',()=>{const html=UI.cardHTML({...card,name:'<img src=x onerror=alert(1)>',prize:{status:'ready',name:'<script>bad()</script>',note:'" onfocus="bad'}});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img'))});
 test('untrusted thumbnail and role paths use catalog defaults',()=>{const m=UI.cardModel({...card,thumbnail:'https://evil.invalid/track',role:'../../private'});assert.equal(m.thumbnail,'art/castle/tower-01-thumb.webp');assert.equal(m.avatarUrl,'art/chars/hero.webp')});
 test('pending ready and redeemed prizes have different member-facing states',()=>{assert.match(UI.prizeText(card.prize),/待.*設定/);assert.equal(UI.prizeText({status:'ready',name:'採果體驗'}),'採果體驗');assert.match(UI.prizeText({status:'redeemed',name:'採果體驗'}),/已兌換/)});
 test('VIP verification URL targets admin lookup without member recovery',()=>{const url=UI.verificationURL(card);assert.ok(url.startsWith('https://hidden-fig-kingdom.vercel.app/?admin&summit='));assert.ok(!url.includes('?r='));assert.ok(!url.includes('SECRET'))});
}


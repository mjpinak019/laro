import { test as base } from '@playwright/test';
import {MAX_XP} from '../../client/src/progression';
import {QUESTS} from '../../client/src/quests';
export * from '@playwright/test';

// Existing gameplay tests start directly; tutorial tests explicitly enable prompts.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(({xp,questIds}) => {
      // Legacy scenarios that replace their whole seed still inherit this veteran setup.
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(this===localStorage&&key==='laro.offline.profile.v1')try{const p=JSON.parse(value);if(p&&typeof p==='object'&&!Array.isArray(p)){if(p.xp===undefined)p.xp=xp;if(p.quests===undefined){const d=new Date();p.quests={day:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,offers:[],claimed:questIds,total:0,active:null};}value=JSON.stringify(p);}}catch{}
        return original.call(this,key,value);
      };
      try {
        const key = 'laro.offline.profile.v1', raw = JSON.parse(localStorage.getItem(key) || '{}');
        if (raw && typeof raw === 'object') {
          if(raw.tutorialPrompts===undefined)raw.tutorialPrompts=false;
          // Existing gameplay checks use a veteran save; journey tests explicitly seed level zero.
          if(raw.xp===undefined)raw.xp=xp;
          if(raw.quests===undefined){const d=new Date();raw.quests={day:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,offers:[],claimed:questIds,total:0,active:null};}
          localStorage.setItem(key,JSON.stringify(raw));
        }
      } catch { /* Tests that deliberately block/corrupt storage retain that behavior. */ }
    },{xp:MAX_XP,questIds:QUESTS.map(q=>q.id)});
    await use(page);
  },
});

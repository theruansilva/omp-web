function e(n){const t=n.trim();if(!t)return t;const r=t.match(/^(?:\+?1)?(\d{3})(\d{3})(\d{4})$/);return r?`(${r[1]}) ${r[2]}-${r[3]}`:t}export{e as f};

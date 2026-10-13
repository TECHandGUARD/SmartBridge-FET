// Deduplicate requests without retaining results across authentication changes.
export function createQueryCache({now=Date.now,maxEntries=100}={}) {
  const entries=new Map();let generation=0;
  return {
    clear(){generation++;entries.clear();},
    get size(){return entries.size;},
    execute(key,query,ttl=10000){
      const cached=entries.get(key);
      if(cached && now()-cached.created<ttl)return cached.promise;
      if(entries.size>=maxEntries)entries.delete(entries.keys().next().value);
      const epoch=generation;
      const entry={created:now(),promise:null};
      entry.promise=Promise.resolve().then(query).catch(error=>{
        if(epoch===generation && entries.get(key)===entry)entries.delete(key);
        throw error;
      });
      entries.set(key,entry);
      return entry.promise;
    }
  };
}

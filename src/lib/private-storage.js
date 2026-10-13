export const PRIVATE_BUCKETS = new Set(['resources','application_documents','nbt_results','chat-attachments','educational_resources','tutor-resources']);
export function storageReference(bucket,path){
 if(!PRIVATE_BUCKETS.has(bucket)||typeof path!=='string'||!path||path.split('/').some(part=>!part||part==='.'||part==='..')||/[?#\\]/.test(path))throw new Error('Invalid private storage reference');
 return `storage://${bucket}/${path}`;
}
export function parseStorageReference(reference){
 if(typeof reference!=='string'||!reference.startsWith('storage://'))return null;
 const value=reference.slice(10),slash=value.indexOf('/');if(slash<0)throw new Error('Invalid storage reference');
 const bucket=value.slice(0,slash),path=value.slice(slash+1);storageReference(bucket,path);return {bucket,path};
}
export async function uploadPrivate(client,bucket,file){
 if(!PRIVATE_BUCKETS.has(bucket))throw new Error('Unsupported private bucket');
 const {data,error}=await client.auth.getUser();if(error||!data?.user)throw new Error('Sign in before uploading');
 const extension=String(file.name||'').split('.').pop().toLowerCase();
 if(!/^[a-z0-9]{1,10}$/.test(extension))throw new Error('Choose a file with a supported extension');
 const path=`${data.user.id}/${crypto.randomUUID()}.${extension}`;
 const uploaded=await client.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type});if(uploaded.error)throw uploaded.error;
 return {reference:storageReference(bucket,path),path,actor:data.user};
}
export async function resolveFile(client,reference){
 const location=parseStorageReference(reference);
 if(!location){const url=new URL(reference);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Invalid file URL');return url.href;}
 const {data,error}=await client.storage.from(location.bucket).createSignedUrl(location.path,60);if(error)throw error;if(!data?.signedUrl)throw new Error('Download unavailable');return data.signedUrl;
}
export async function removePrivate(client,reference){
 const location=parseStorageReference(reference);if(!location)throw new Error('Legacy files require administrator review');
 const {error}=await client.storage.from(location.bucket).remove([location.path]);if(error)throw error;
}

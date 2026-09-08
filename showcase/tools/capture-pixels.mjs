// Adapted from Vehicle Lab, MIT, 2026 Vehicle Lab contributors.
// Small rasterization noise is tolerated; localized missing geometry is not.
export const PIXEL_LIMITS={mean:0.01,tileMean:0.5,changedFraction:0.0005};
export function compareReadbacks(previous,current,width,height){
 if(previous.length!==current.length||current.length!==width*height*4)throw Error('Readback dimensions differ');
 const columns=Math.ceil(width/64),rows=Math.ceil(height/64),sums=new Float64Array(columns*rows),counts=new Uint32Array(columns*rows);
 let total=0,changed=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,tile=Math.floor(y/64)*columns+Math.floor(x/64);
  const r=Math.abs(previous[i]-current[i]),g=Math.abs(previous[i+1]-current[i+1]),b=Math.abs(previous[i+2]-current[i+2]);
  total+=r+g+b;sums[tile]+=r+g+b;counts[tile]+=3;if(Math.max(r,g,b)>8)changed++;
 }
 const mean=total/(width*height*3),tileMean=Math.max(...sums.map((sum,i)=>sum/counts[i])),changedFraction=changed/(width*height);
 return {match:mean<=PIXEL_LIMITS.mean&&tileMean<=PIXEL_LIMITS.tileMean&&changedFraction<=PIXEL_LIMITS.changedFraction,mean,tileMean,changedFraction};
}

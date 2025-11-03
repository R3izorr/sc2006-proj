export function colorForScore(v:number){
  return v>2?'#800026':v>1?'#BD0026':v>0.5?'#E31A1C':v>0?'#FC4E2A':v>-0.5?'#FD8D3C':v>-1?'#FEB24C':'#FED976'
}



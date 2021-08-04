//-------------------------------
// User parameters
// ------------------------------
var dipAngle = 90
var outFile  = 'data.xyz'
// ------------------------------
// -*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
//            DO NOT TOUCH AFTER THIS LINE
// -*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
if (argc < 1) {
    print("Missing input PL filenames as argument")
    exit(-1)
}
out = new File(outFile)
out.writeln("# x y z nx ny nz")
var dip = dipAngle * Math.PI/180
var COS = Math.cos(dip)
var SIN = Math.sin(dip)
for (var i=1; i<=argc; ++i) {
    name = argv[i] ;
    f = new FileRead(name)
    var map = {}
    var v = new Vec3
    while(!f.end()) {
        s = f.readline()
        l = tokenize(s)
        if (l.length>0 && l[0]=="VRTX") {
            map[l[1]] = [1.0*l[2], 1.0*l[3], 1.0*l[4]]
            continue
        }
        if (l.length>0 && l[0]=="SEG") {
            var v1 = map[l[1]]
            var v2 = map[l[2]]
            var p = [0,0,0]
            for (var i=0; i<3; ++i) {
                p[i] = (v1[i]+v2[i])/2.
            }
            var dx = (v2[0]-v1[0])
            var dy = (v2[1]-v1[1])
            v.set(dy, -dx, 0)
            v.normalize()				
            v.set_x(v.x()*SIN)
			v.set_y(v.y()*SIN)
            v.set_z(COS)
            v.normalize()
            out.writeln(p[0]+" "+p[1]+" "+p[2]+" "+v.x()+" "+v.y()+" "+v.z())
        }
    }
}
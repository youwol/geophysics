// SANTOS models from INVERSION v1.0
//
// Constants
Rsalt	= 2600	 ;			// average salt density (kg/m3)
Rsed	= 2900 ;			// average sediment density (kg/m3)
nu		= 0.25 ;			// Poisson's ratio
E		= 30e9 ;			// Young's modulus (Pa)
theta	= 66.77 ;			// orientation of SH from North to the East (degree)
shift	= -10061096 ;		// salt pressure shift (Pa), -10e8 <shift< +10e8
Kh		= 0.577 ;			// Kh=Sh/Sv => fixed for the inversion
KH		= 0.582 ;			// KH=SH/Sv => with Rb=0.57=(SH-Sh)/(Sv-Sh)


// IBEM3D MODEL
// iBem3D parameters
model = new Model ;
model.set_half_space(false) ;
model.set_poisson(nu) ;
model.set_young(E) ;


// SALT
// iBem3D boundary conditions on salt
var l1 = new Faults (model) ;
l1.load("Fernandina.ts") ;
l1.create_attribute(2,"Ps", "0") ; // salt pressure gradient

// Compute salt pressure gradient
var ite = new ElementIterator ;
for (ite.start(l1); ite.more(); ite.next()) {
                e = ite.current() ;
                z = e.center().z() ;
                e.set_attribute("Ps", shift + Rsalt*9.81*abs(z) ) ;
}

var bc = new FaultsBc ;
bc.set_bc("x", "t", "0.0") ;
bc.set_bc("y", "t", "0.0") ;
bc.set_bc("z", "t", "Ps") ;
bc.apply(l1) ;


// iBem3D options on observation points

var grid = new Grids (model) ;				// Upper Pliocene grid
grid.load ("grid.ts") ;



// iBem3D far field stresses and options 

Sv = "-9.81*abs(z)*" + Rsed ;
SH = "-9.81*" + KH + "*abs(z)*" + Rsed ;
Sh = "-9.81*" + Kh + "*abs(z)*" + Rsed ;

var remote = new Remote ;
remote.set_h (Sh) ;
remote.set_H (SH) ;
remote.set_v (Sv) ;
remote.rotate (theta) ;
remote.apply(model) ;

// iBem3D solver options
// var solver = new PIterSolver(model) ;
// var solver = new PardisoSolver(model) ;
var solver = new GmresSolver(model) ;
// solver.set_max_iter (1000);
// solver.set_min_items (32);
solver.set_tolerance(1e-10) ;

solver.run() ;
l1.save ("results_Fernandina.ts") ;


var gc = new PGridsComputer ;
//var gc = new PHGridsComputer ;
gc.compute("stress", true) ;
gc.compute("displ", true) ;
gc.apply(grid) ;
grid.save ("results_grid.ts") ;


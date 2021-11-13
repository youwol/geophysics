## Test inversion joints
Faults is `Fault-S1`
```js
Rsalt    = 1000
Rsed     = 2000
nu       = 0.25
E        = 30e9
shift    = 6.5e7
theta    = 141
Kh       = 0.75
KH       = 0.82
HS       = false
gradient = true
ps       = shift + Rsalt*9.81*abs(z)
Sv       = "-9.81*abs(z)*" + Rsed
SH       = "-9.81*" + KH + "*abs(z)*" + Rsed
Sh       = "-9.81*" + Kh + "*abs(z)*" + Rsed
```

Generated joints (normal to the joints)
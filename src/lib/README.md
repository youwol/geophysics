## Data

Data allows to store:

- measured values (displacement, normal, magnitude ...)
- computed values to perform superposition (displacement, srtain or stress)

The `costData` function is decorrelated from the computed values of this class. Only the measure are used. It allows to compute the cost given a data in the same format (Serie) as the measure.

The `cost` function is similar to `costData` except that the argument is `Alpha`, which allows to compute by superposition (therefore using the computed values of this class) the data to be compared.

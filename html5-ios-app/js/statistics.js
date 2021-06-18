var Statistics = function() {
    this.linearRegression = function(y,x){
        var lr = {};
        var n = y.length;
        var sum_x = 0;
        var sum_y = 0;
        var sum_xy = 0;
        var sum_xx = 0;
        var sum_yy = 0;

        for (var i = 0; i < y.length; i++) {

            sum_x += x[i];
            sum_y += y[i];
            sum_xy += (x[i]*y[i]);
            sum_xx += (x[i]*x[i]);
            sum_yy += (y[i]*y[i]);
        }

        lr['slope'] = (n * sum_xy - sum_x * sum_y) / (n*sum_xx - sum_x * sum_x);
        lr['intercept'] = (sum_y - lr.slope * sum_x)/n;
        lr['r2'] = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);

        return lr;
    }

    this.sum = function(a) {
        return a.reduce((acc, val) => acc + val)
    }

    this.mean = function(a) {
        return this.sum(a) / a.length
    }

    this.stddev = function(arr) {
        const arr_mean = this.mean(arr)
        const r = function(acc, val) {
            return acc + ((val - arr_mean) * (val - arr_mean))
        }
        return Math.sqrt(arr.reduce(r, 0.0) / arr.length)
    }

    this.smoothedZscore = function(y, params) {
        var p = params || {}
        // init cooefficients
        const lag = p.lag || 5
        const threshold = p.threshold || 3.5
        const influence = p.influece || 0.5

        if (y === undefined || y.length < lag + 2) {
            throw ` ## y data array to short(${y.length}) for given lag of ${lag}`
        }

        // init variables
        var signals = Array(y.length).fill(0)
        var filteredY = y.slice(0)
        const lead_in = y.slice(0, lag)

        var avgFilter = []
        avgFilter[lag - 1] = this.mean(lead_in)
        var stdFilter = []
        stdFilter[lag - 1] = this.stddev(lead_in)

        for (var i = lag; i < y.length; i++) {
            if (Math.abs(y[i] - avgFilter[i - 1]) > (threshold * stdFilter[i - 1])) {
                if (y[i] > avgFilter[i - 1]) {
                    signals[i] = +1 // positive signal
                } else {
                    signals[i] = -1 // negative signal
                }
                filteredY[i] = influence * y[i] + (1 - influence) * filteredY[i - 1]
            } else {
                signals[i] = 0 // no signal
                filteredY[i] = y[i]
            }

            // adjust the filters
            const y_lag = filteredY.slice(i - lag, i)
            avgFilter[i] = this.mean(y_lag)
            stdFilter[i] = this.stddev(y_lag)
        }

        return signals
    }
}

apps['stats'] = new Statistics()
package report

import (
    "math"
    "time"
)

type Result struct {
    Seq   int           `json:"seq"`
    RTT   time.Duration `json:"rtt,omitempty"`
    Error string        `json:"error,omitempty"`
    Addr  string        `json:"addr,omitempty"`
}

type Summary struct {
    Sent   int           `json:"sent"`
    Recv   int           `json:"recv"`
    Loss   float64       `json:"loss"`
    Min    time.Duration `json:"min,omitempty"`
    Avg    time.Duration `json:"avg,omitempty"`
    Max    time.Duration `json:"max,omitempty"`
    StdDev time.Duration `json:"stddev,omitempty"`
}

type Report struct {
    Protocol string   `json:"protocol"`
    Target   string   `json:"target"`
    Addr     string   `json:"addr"`
    Port     int      `json:"port,omitempty"`
    Results  []Result `json:"results"`
    Summary  Summary  `json:"summary"`
}

func Summarize(results []Result, sent int) Summary {
    recv := 0
    rtts := make([]time.Duration, 0, len(results))
    for _, r := range results {
        if r.Error == "" {
            recv++
            rtts = append(rtts, r.RTT)
        }
    }

    s := Summary{Sent: sent, Recv: recv}
    if sent > 0 {
        s.Loss = (float64(sent-recv) / float64(sent)) * 100
    }
    if recv == 0 {
        return s
    }

    min := rtts[0]
    max := rtts[0]
    var total float64
    for _, rtt := range rtts {
        if rtt < min {
            min = rtt
        }
        if rtt > max {
            max = rtt
        }
        total += float64(rtt)
    }
    avg := total / float64(recv)

    var variance float64
    for _, rtt := range rtts {
        d := float64(rtt) - avg
        variance += d * d
    }
    stddev := math.Sqrt(variance / float64(recv))

    s.Min = min
    s.Max = max
    s.Avg = time.Duration(avg)
    s.StdDev = time.Duration(stddev)
    return s
}

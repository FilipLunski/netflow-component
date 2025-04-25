"use client";
import React from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import {
  getAggregatedNetFlowCount,
  getAggregatedNetFlowVolume,
} from "@/lib/getNetFLowStats";
import { Granularity, Metric } from "@/lib/netFlowTypes";
import { SeriesValueFormatter } from "@mui/x-charts/internals";
import { start } from "repl";

const dateFormatter = (granularity: Granularity): ((date: Date) => string) => {
  return (d: Date) => {
    // console.log("datetime: "+d);
    const date = new Date(d);
    if (
      date.getHours() === 0 &&
      date.getMinutes() === 0 &&
      date.getSeconds() === 0
    ) {
      if (date.getDate() === 1) {
        return date.toLocaleTimeString("UTC", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        });
      } else {
        return date.toLocaleTimeString("UTC", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        });
      }
    }
    if (["1m", "5m", "30m", "1h"].includes(granularity)) {
      return date.toLocaleTimeString("UTC", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleTimeString("UTC", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    }
  };
};

const NetFlowLineChart: React.FC<{
  granularity: Granularity;
  metric: Metric;
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}> = ({
  granularity,
  metric,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const [data, setData] = React.useState<any[]>([]);

  React.useEffect(() => {
    console.log("Granularity: ", granularity, "; Metric: ", metric);
    if (metric === "count") {
      getAggregatedNetFlowCount(granularity).then(setData);
    } else if (metric === "volume") {
      getAggregatedNetFlowVolume(granularity).then(setData);
    }
    console.log("Data fetching started for granularity: ", granularity);
  }, [granularity, metric]);

  React.useEffect(() => {
    const minDate = new Date(
      Math.min(...data.map((item) => item.time.getTime()))
    );
    const maxDate = new Date(
      Math.max(...data.map((item) => item.time.getTime()))
    );
    if (minDate > startDate) {
      onStartDateChange(minDate);
    }
    if (maxDate < endDate) {
      onEndDateChange(maxDate);
    }
    console.log(data);
  }, [data]);

  const volumeFormatter: SeriesValueFormatter<number | null> = (
    value: number | null
  ) => {
    if (value === null) {
      return null;
    }
    if (metric === "count") {
      if (value < 1000) {
        return value.toString();
      }
      if (value < 1000000) {
        return `${(value / 1000).toFixed(2)}K`;
      }
      return `${(value / 1000000).toFixed(2)}M`;
    } else {
      let volumeUnit = "";
      let volumeReductionFactor = 1;
      if (value < 1000) {
        volumeUnit = "B";
      } else if (value < 1000000) {
        volumeUnit = "KB";
        volumeReductionFactor = 1000;
      } else if (value < 1000000000) {
        volumeUnit = "MB";
        volumeReductionFactor = 1000000;
      } else if (value < 1000000000000) {
        volumeUnit = "GB";
        volumeReductionFactor = 1000000000;
      } else if (value < 1000000000000000) {
        volumeUnit = "TB";
        volumeReductionFactor = 1000000000000;
      } else if (value < 1000000000000000000) {
        volumeUnit = "PB";
        volumeReductionFactor = 1000000000000000;
      }
      return `${(value / volumeReductionFactor).toFixed(2)} ${volumeUnit}`;
    }
  };

  return (
    <LineChart
      dataset={data.filter((item) => {
        return (
          item.time >= new Date(startDate.getTime() - 12 * 60 * 60 * 1000) &&
          item.time <= new Date(endDate.getTime() + 12 * 60 * 60 * 1000)
        );
      })}
      xAxis={[
        {
          dataKey: "time",
          valueFormatter: dateFormatter(granularity),
          min: startDate,
          max: endDate,
        },
      ]}
      series={[
        {
          dataKey: "amount",
          area: true,
          valueFormatter: volumeFormatter,
          showMark: false,
        },
      ]}
      height={300}
      width={800}
      grid={{ vertical: true, horizontal: true }}
    />
  );
};

export default NetFlowLineChart;

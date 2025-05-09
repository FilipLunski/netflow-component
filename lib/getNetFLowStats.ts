"use server";
import { time, timeStamp } from "console";
import clientPromise from "./mongodb";
import { ObjectId, Timestamp } from "mongodb";
import {
  ApplicationProtocols,
  Granularity,
  granularityMap,
  InternetProtocols,
  Metric,
  ProtocolType,
} from "./netFlowTypes";

interface FlowData {
  PROTOCOL: number;
  IN_BYTES: number;
  L4_DST_PORT: number;
  L4_SRC_PORT: number;
}

export async function getProtocolStats(
  type: ProtocolType = "low",
  metric: Metric = "packets",
  startDate: Date = new Date(0),
  endDate: Date = new Date()
) {
  const db = (await clientPromise).db("netflow_db");
  const collection = db.collection<FlowData>("netflow_records");

  const useAppProtocols = type === "app";
  const useBytes = metric === "bytes";

  const pipeline = [
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $addFields: {
        app_protocol: {
          $let: {
            vars: {
              protoMap: ApplicationProtocols,
            },
            in: {
              $switch: {
                branches: Object.entries(ApplicationProtocols).map(
                  ([key, val]) => ({
                    case: {
                      $or: [
                        { $in: ["$L4_DST_PORT", val] },
                        { $in: ["$L4_SRC_PORT", val] },
                      ],
                    },
                    then: key,
                  })
                ),
                default: "Other",
              },
            },
          },
        },
        protocol_name: {
          $let: {
            vars: {
              protoMap: InternetProtocols,
            },
            in: {
              $switch: {
                branches: Object.entries(InternetProtocols).map(
                  ([key, val]) => ({
                    case: { $eq: ["$PROTOCOL", parseInt(key)] },
                    then: val,
                  })
                ),
                default: "Unknown",
              },
            },
          },
        },
      },
    },
    ...(useAppProtocols
      ? [
          {
            $match: {
              app_protocol: { $ne: "Other" },
            },
          },
        ]
      : []),
    {
      $group: {
        _id: useAppProtocols ? "$app_protocol" : "$protocol_name",
        value: useBytes ? { $sum: "$IN_BYTES" } : { $sum: "$IN_PKTS" },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const data: { label: string; value: number }[] = results.map((item) => ({
    label: item._id,
    value: item.value,
  }));
  return data as { label: string; value: number }[];
}

function truncateDate(date: Date, granularity: Granularity): Date {
  const d = new Date(date); // clone to avoid mutating original

  switch (granularity) {
    case "1m":
      d.setSeconds(0, 0);
      break;
    case "5m":
      d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
      break;
    case "30m":
      d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0);
      break;
    case "1h":
      d.setMinutes(0, 0, 0);
      break;
    case "12h":
      d.setHours(Math.floor(d.getHours() / 12) * 12, 0, 0, 0);
      break;
    case "1d":
      d.setHours(0, 0, 0, 0);
      break;
    default:
      throw new Error("Unsupported granularity: " + granularity);
  }

  return d;
}

export const getVolumOverTime = async (
  granularity: Granularity,
  metric: Metric,
  startDate: Date,
  endDate: Date,
  ipAddress: string = ""
) => {
  const db = (await clientPromise).db("netflow_db");
  const collection = db.collection<FlowData>("netflow_records");
  console.log(
    "Granularity: ",
    granularity,
    "; Metric: ",
    metric,
    "; Start Date: ",
    startDate,
    "; End Date: ",
    endDate,
    "; IP Address: ",
    ipAddress
  );

  const { unit, binSize, minutes } = granularityMap[granularity];

  const granularityInMillis = minutes * 60 * 1000;
  const milisBound = minutes * 60 * 200;

  const pipeline = [
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },

    {
      $match: {
        $expr: {
          $or: [
            { $eq: ["$IPV4_SRC_ADDR", ipAddress] },
            { $eq: ["$IPV4_DST_ADDR", ipAddress] },
            { $eq: ["$IPV6_SRC_ADDR", ipAddress] },
            { $eq: ["$IPV6_DST_ADDR", ipAddress] },
            { $eq: [ipAddress, ""] },
          ],
        },
      },
    },
    {
      $addFields: {
        direction: {
          $cond: [
            {
              $and: [
                {
                  $regexMatch: {
                    input: "$IPV4_SRC_ADDR",
                    regex: /^10\.0\.1\./,
                  },
                },
                {
                  $regexMatch: {
                    input: "$IPV4_DST_ADDR",
                    regex: /^10\.0\.1\./,
                  },
                },
              ],
            },
            "internal",
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$IPV4_SRC_ADDR",
                    regex: /^10\.0\.1\./,
                  },
                },
                "outbound",
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: "$IPV4_DST_ADDR",
                        regex: /^10\.0\.1\./,
                      },
                    },
                    "inbound",
                    "external",
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        truncatedTime: {
          $dateTrunc: {
            date: "$timestamp",
            unit,
            binSize,
            timezone: "+02",
          },
        },
      },
    },
    {
      $match: {
        direction: { $in: ["inbound", "outbound", "internal"] },
      },
    },
    {
      $group: {
        _id: {
          time: "$truncatedTime",
          direction: "$direction",
        },
        value:
          metric === "bytes" ? { $sum: "$IN_BYTES" } : { $sum: "$IN_PKTS" },
      },
    },
    {
      $group: {
        _id: "$_id.time",
        inbound: {
          $sum: {
            $cond: [{ $eq: ["$_id.direction", "inbound"] }, "$value", 0],
          },
        },
        outbound: {
          $sum: {
            $cond: [{ $eq: ["$_id.direction", "outbound"] }, "$value", 0],
          },
        },
        internal: {
          $sum: {
            $cond: [{ $eq: ["$_id.direction", "internal"] }, "$value", 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        time: "$_id",
        inbound: 1,
        outbound: 1,
        internal: 1,
      },
    },
    {
      $sort: { time: 1 },
    },
  ];

  const result = await collection.aggregate(pipeline).toArray();
  console.log(result);

  return result;
};

export const getAggregatedNetFlowVolume = async (granularity: Granularity) => {
  const db = (await clientPromise).db("netflow_db");
  const collection = db.collection<FlowData>("netflow_records");

  // Map granularity to Mongo units + bin sizes

  const { unit, binSize, minutes } = granularityMap[granularity];

  const granularityInMillis = minutes * 60 * 1000;
  const milisBound = minutes * 60 * 200;

  const pipeline = [
    {
      $match: {
        $expr: {
          $lt: [
            {
              $abs: {
                $subtract: ["$FIRST_SWITCHED", "$LAST_SWITCHED"],
              },
            },
            milisBound,
          ],
        },
      },
    },
    {
      $addFields: {
        truncatedTime: {
          $dateTrunc: {
            date: "$timestamp",
            timezone: "+02",
            unit,
            binSize,
          },
        },
      },
    },
    {
      $group: {
        _id: "$truncatedTime",
        value: { $sum: "$IN_BYTES" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ];

  const result = await collection.aggregate(pipeline).toArray();

  const data: { timeStart: Date; timeEnd: Date; value: number }[] = result.map(
    (item) => ({
      timeStart: item._id,
      timeEnd: new Date(item._id + granularityInMillis),
      value: item.value,
    })
  );

  const pipeline2 = [
    {
      $addFields: {
        duration_ms: {
          $abs: {
            $subtract: ["$LAST_SWITCHED", "$FIRST_SWITCHED"],
          },
        },
      },
    },
    {
      $match: {
        $expr: {
          $gte: ["$duration_ms", milisBound],
        },
      },
    },
    {
      $project: {
        _id: 1,
        timestamp: 1,
        FIRST_SWITCHED: 1,
        LAST_SWITCHED: 1,
        duration_ms: 1,
        IN_BYTES: 1,
      },
    },
  ];

  const result2 = await collection.aggregate(pipeline2).toArray();
  const data2: {
    timeStart: Date;
    timeEnd: Date;
    duration: number;
    volume: number;
  }[] = result2.map((item) => ({
    timeStart: truncateDate(item.timestamp, granularity),
    timeEnd: truncateDate(item.timestamp, granularity) + item.duration_ms,
    duration: item.duration_ms,
    volume: item.IN_BYTES,
  }));

  const finalResult: { time: Date; amount: number }[] = data.map((item) => {
    // data2
    //   .filter((item2) => {
    //     (item2.timeStart >= item.timeStart &&
    //       item2.timeStart <= item.timeEnd) ||
    //       (item2.timeEnd >= item.timeStart && item2.timeEnd <= item.timeEnd);
    //   })
    //   .map((item3) => {
    //     if (
    //       item3.timeStart >= item.timeStart &&
    //       item3.timeEnd <= item.timeEnd
    //     ) {
    //       item.value += item3.volume;
    //     } else if (
    //       item3.timeStart >= item.timeStart &&
    //       item3.timeStart <= item.timeEnd
    //     ) {
    //       item.value +=
    //         (item3.volume *
    //           (item.timeEnd.getTime() - item3.timeStart.getTime())) /
    //         (item3.timeEnd.getTime() - item3.timeStart.getTime());
    //     } else if (
    //       item3.timeEnd >= item.timeStart &&
    //       item3.timeEnd <= item.timeEnd
    //     ) {
    //       item.value +=
    //         (item3.volume *
    //           (item3.timeEnd.getTime() - item.timeStart.getTime())) /
    //         (item3.timeEnd.getTime() - item3.timeStart.getTime());
    //     } else if (
    //       item3.timeStart <= item.timeStart &&
    //       item3.timeEnd >= item.timeEnd
    //     ) {
    //       item.value +=
    //         (item3.volume *
    //           (item.timeEnd.getTime() - item.timeStart.getTime())) /
    //         (item3.timeEnd.getTime() - item3.timeStart.getTime());
    //     } else if (
    //       item3.timeStart >= item.timeStart &&
    //       item3.timeEnd <= item.timeEnd
    //     ) {
    //       item.value +=
    //         (item3.volume *
    //           (item3.timeEnd.getTime() - item3.timeStart.getTime())) /
    //         (item3.timeEnd.getTime() - item3.timeStart.getTime());
    //     }
    //   });

    return {
      time: item.timeStart,
      amount: item.value,
    };
  });

  console.log(finalResult);

  return finalResult;
};

export const getTopTalkers = async (
  n: number,
  metric: Metric,
  startDate: Date,
  endDate: Date
) => {
  const db = (await clientPromise).db("netflow_db");
  const collection = db.collection<FlowData>("netflow_records");

  const pipeline = [
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $project: {
        address: {
          $setUnion: [
            [
              "$IPV4_SRC_ADDR",
              "$IPV4_DST_ADDR",
              "$IPV6_SRC_ADDR",
              "$IPV6_DST_ADDR",
            ],
          ],
        },
        IN_BYTES: 1,
        IN_PKTS: 1,
      },
    },
    {
      $unwind: "$address",
    },
    {
      $match: {
        address: {
          $ne: null,
        },
      },
    },
    {
      $group: {
        _id: "$address",
        amount:
          metric === "bytes" ? { $sum: "$IN_BYTES" } : { $sum: "$IN_PKTS" },
      },
    },
    {
      $sort: { amount: -1 },
    },
    {
      $limit: n,
    },
  ];

  const result = await collection.aggregate(pipeline).toArray();

  let finalResult: { address: string; amount: number }[] = result.map(
    (item) => ({
      address: item._id,
      amount: item.amount,
    })
  );
  console.log(finalResult);

  return finalResult;
};

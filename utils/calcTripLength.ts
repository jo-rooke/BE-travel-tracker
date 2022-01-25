interface ITripLength {
  exp_time: string;
}

export default function calcTripLength(startAndEnd: ITripLength[]) {
  const startDate = startAndEnd[0].exp_time.slice(0, 10).split("-");
  const endDate = startAndEnd[1].exp_time.slice(0, 10).split("-");

  return `${startDate} - ${endDate}`;
}

# Per-game sports forecasts

Every displayed game has a lazy, same-origin forecast action. The scoreboard keeps
its existing polling and actual scores. The forecast API validates the requested
sport, allowed ESPN feed and numeric event identifier, then verifies the provider
response belongs to that event and league. No caller-supplied URL is fetched.

`/api/sport/prediction` returns separate score, winner and scorer fields with
individual availability reasons. Completed games show the provider's actual
result. Canceled or unconfirmed events do not become forecasts or final scores.

## Evidence and models

- Football uses explicit home/away scores from up to five prior completed games
  per team. At least three comparable results per team are required. Own goals
  scored and opposing goals conceded are averaged; independent Poisson counts
  produce a distribution of regulation-time scorelines. The displayed exact
  score is one modal scenario. Win/draw/loss probabilities sum over all scorelines.
- Basketball requires at least five prior results and uses observed points and
  scoring variance. An attributed ESPN pregame Matchup Predictor can supply the
  winner estimate separately. Degenerate data do not become certain predictions.
- NHL forecasts describe regulation time, not an invented overtime winner.
  Identifiable overtime/shootout one-goal results are restored to their regulation
  tie before computing goal averages.
- Tennis is limited to supported pre-match singles with at least three normal
  completed matches per player in the same tournament. A verified best-of-three
  format is required. Smoothed set-win rates feed a log5 set-strength comparison
  and the four possible match scorelines. Seeds are never treated as world ranks.

These are simple, uncalibrated estimates from limited recent evidence. They do
not establish an observed accuracy rate. Opponent strength, tactics, changing
conditions and player roles are not fully modeled. Technical method names stay
in code and documentation; the product explains the practical limits plainly.

## Live games and goalscorers

Live forecasts preserve the reported score and model only the remaining supported
regulation time. Unsupported clocks, stale source timestamps and reported red
cards prevent a misleading football result forecast. The original source time
is retained; reading a response does not create a new data timestamp.

Football scorer candidates come from actual season goals and appearances. Player
IDs are joined to the reported match roster. Known injuries, ineligible bench
players, substitutions and red cards are filtered. Without a reported lineup,
the player's possible participation is explicitly unconfirmed. Seasonal goal
counts do not become fabricated individual scoring probabilities.

The client rejects event, participant, state and live-score mismatches. A changed
live score invalidates an earlier forecast; visible live forecasts also expire
after two minutes. Reloading must fetch or revalidate the correct game snapshot.

## Request limits and verification

Provider requests have timeouts, bounded in-memory caches and shared in-flight
promises. Expanding one game does not fetch every match or roster in the list.
Unit tests cover probability mass, live score preservation, source identity,
freshness, invalid clocks, player eligibility, future result leakage, tennis
format, missing data and small probability formatting. Browser checks exercise
real providers and a controlled changed-score response.


#!/usr/bin/env bash
# Parse docker_log.txt, extract elapsed_ms, convert to seconds,
# print avg/min/max + graph-ready output.

LOGFILE="docker_log_random.txt"

if [[ ! -f "$LOGFILE" ]]; then
  echo "Error: $LOGFILE not found in current directory." >&2
  exit 1
fi

awk '
/qwen_generate_timing/ {
  # Pull out "elapsed_ms": <number>
  if (match($0, /"elapsed_ms":[ ]*([0-9.]+)/, m)) {
    sec = m[1] / 1000.0
    count++
    sum += sec

    if (count == 1 || sec < min) min = sec
    if (count == 1 || sec > max) max = sec

    vals[count] = sec
  }
}
END {
  if (count == 0) {
    print "No elapsed_ms values found in log." > "/dev/stderr"
    exit 1
  }

  avg = sum / count

  # Summary (still graph-friendly: commented)
  printf "# count=%d\n", count
  printf "# avg=%.3f s\n", avg
  printf "# min=%.3f s\n", min
  printf "# max=%.3f s\n", max
  printf "# index\tseconds\n"

  # Graph-ready data: index seconds
  for (i = 1; i <= count; i++) {
    printf "%d\t%.3f\n", i, vals[i]
  }
}
' "$LOGFILE"

"""Exact same-synthesis WordBoundary alignment for the public group-two English voice library."""
import re, subprocess, unicodedata

def normalize(text):
    return "".join(c.lower() for c in unicodedata.normalize("NFKD", text)
                   if c.isalnum() and not unicodedata.combining(c))

def cue_words(text, boundaries, duration):
    parts = re.findall(r"\S+", text)
    normal_parts = [normalize(p) for p in parts]
    if not parts or any(not p for p in normal_parts):
        raise ValueError("Unalignable transcript: " + text)
    flat = "".join(normal_parts)
    cursor = 0
    spans = {}
    for item in boundaries:
        if item.get("type") != "WordBoundary":
            continue
        token = normalize(item.get("text", ""))
        if not token:
            continue
        if flat[cursor:cursor + len(token)] != token:
            raise ValueError("Word boundary mismatch between audio and text: "
                             + text + " <> " + item.get("text", ""))
        onset = max(0, round(item["offset"] / 10000))
        offset = max(onset + 1, round((item["offset"] + item["duration"]) / 10000))
        offset = min(duration, offset)
        begin = cursor
        end = cursor + len(token)
        pos = 0
        for index, word in enumerate(normal_parts):
            word_end = pos + len(word)
            if pos < end and word_end > begin:
                if index not in spans:
                    spans[index] = [onset, offset]
                else:
                    spans[index][1] = offset
            pos = word_end
        cursor = end
    if cursor != len(flat) or len(spans) != len(parts):
        raise ValueError("Incomplete real word boundary coverage: " + text)
    cues = [[i, int(spans[i][0]), int(spans[i][1])] for i in range(len(parts))]
    if any(not (0 <= v[1] < v[2] <= duration + 45) for v in cues):
        raise ValueError("Word boundary exceeds audio duration")
    # Edge WordBoundary occasionally reports adjacent words with a small overlap
    # (typically around a contraction or number). Preserve the measured onsets;
    # use their intervening midpoint only for the overlap, never length heuristics.
    overlap_repairs = []
    for i in range(1, len(cues)):
        overlap = cues[i-1][2] - cues[i][1]
        if overlap > 0:
            if overlap > 220:
                raise ValueError(f"Unreliable WordBoundary overlap {overlap}ms at word {i}: {text}")
            midpoint = round((cues[i-1][2] + cues[i][1]) / 2)
            if midpoint <= cues[i-1][1] or midpoint >= cues[i][2]:
                raise ValueError(f"Impossible adjacent acoustic cue repair at word {i}: {text}")
            cues[i-1][2] = midpoint
            cues[i][1] = midpoint
            overlap_repairs.append({"at_word": i, "overlap_ms": overlap})
    if any(cues[i-1][2] > cues[i][1] for i in range(1, len(cues))):
        raise ValueError("Overlapping same-recording cues remain after repair")
    return cues, overlap_repairs

def duration_ms(path):
    data = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                                    "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
                                    str(path)], text=True)
    return round(float(data.strip()) * 1000)


import subprocess
import glob
import os

BRAIN_DIR = "/mnt/c/Users/nisha/.gemini/antigravity-ide/brain/19eb44da-6b1f-476b-81fd-bd450af5f031"
AUDIO_DIR = f"{BRAIN_DIR}/audio"
OUT_DIR = f"{BRAIN_DIR}/video_output"
os.makedirs(OUT_DIR, exist_ok=True)

parts = [
    {
        "id": 1,
        "name": "Analyze & Ingestion",
        "video": f"{BRAIN_DIR}/demo_part1_analyze_1792337032008.webp",
        "audio": f"{AUDIO_DIR}/part1_analyze.wav"
    },
    {
        "id": 2,
        "name": "Dashboard Overview",
        "video": f"{BRAIN_DIR}/demo_part2_dashboard_1792337115474.webp",
        "audio": f"{AUDIO_DIR}/part2_dashboard.wav"
    },
    {
        "id": 3,
        "name": "Blast Radius & Simulation",
        "video": f"{BRAIN_DIR}/demo_part3_blast_radius_1792337281694.webp",
        "audio": f"{AUDIO_DIR}/part3_blast_radius.wav"
    },
    {
        "id": 4,
        "name": "Remediation Engine",
        "video": f"{BRAIN_DIR}/demo_part4_remediation_1792337433083.webp",
        "audio": f"{AUDIO_DIR}/part4_remediation.wav"
    },
    {
        "id": 5,
        "name": "Sentinel AI Mascot",
        "video": f"{BRAIN_DIR}/demo_part5_sentinel_1792337563902.webp",
        "audio": f"{AUDIO_DIR}/part5_sentinel.wav"
    }
]

mp4_files = []

for p in parts:
    pid = p["id"]
    print(f"\n==========================================")
    print(f"Processing Part {pid}: {p['name']}")
    print(f"==========================================")

    frames_dir = f"/tmp/frames_part{pid}"
    os.system(f"rm -rf {frames_dir} && mkdir -p {frames_dir}")

    # Extract all frames from webp using anim_dump
    print("Extracting frames...")
    subprocess.run(["anim_dump", "-folder", frames_dir, p["video"]], check=True)

    frames = sorted(glob.glob(f"{frames_dir}/dump_*.png"))
    num_frames = len(frames)
    print(f"Extracted {num_frames} frames.")

    # Get audio duration
    ffprobe_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        p["audio"]
    ]
    dur_str = subprocess.check_output(ffprobe_cmd).decode().strip()
    audio_dur = float(dur_str)
    print(f"Audio duration: {audio_dur:.2f} seconds.")

    # Calculate optimal framerate so animation smoothly spans the audio
    # Minimum 1 fps, maximum 30 fps
    fps = max(1.0, min(30.0, num_frames / audio_dur))
    print(f"Calculated framerate: {fps:.3f} fps")

    part_mp4 = f"{OUT_DIR}/part{pid}.mp4"
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", f"{frames_dir}/dump_%04d.png",
        "-i", p["audio"],
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        part_mp4
    ]
    print(f"Encoding part {pid} to MP4...")
    subprocess.run(ffmpeg_cmd, check=True)
    mp4_files.append(part_mp4)
    print(f"Part {pid} encoded successfully: {part_mp4}")

# Now concatenate all parts
concat_list_file = f"{OUT_DIR}/concat_list.txt"
with open(concat_list_file, "w") as f:
    for mf in mp4_files:
        f.write(f"file '{mf}'\n")

final_mp4 = f"{OUT_DIR}/keystone_3min_demo_walkthrough.mp4"
print(f"\nConcatenating all 5 parts into final master video: {final_mp4}")
concat_cmd = [
    "ffmpeg", "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concat_list_file,
    "-c", "copy",
    final_mp4
]
subprocess.run(concat_cmd, check=True)

# Copy final video to repo root and brain artifacts
target_root = "/mnt/c/Users/nisha/Hackathon/Graph Hacks Hackathon/keystone_3min_demo_walkthrough.mp4"
subprocess.run(["cp", "-f", final_mp4, target_root], check=True)
subprocess.run(["cp", "-f", final_mp4, f"{BRAIN_DIR}/keystone_3min_demo_walkthrough.mp4"], check=True)

final_size = os.path.getsize(target_root) / (1024 * 1024)
print(f"\n==========================================")
print(f"SUCCESS! Master Video Generated:")
print(f"Path: {target_root}")
print(f"Size: {final_size:.2f} MB")
print(f"==========================================")

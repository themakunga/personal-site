"""Publish a generated site atomically, retaining the previous release."""

import fcntl
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def publish(source: Path, destination: Path) -> None:
    if not (source / "index.html").is_file():
        raise FileNotFoundError(f"Generated site has no index.html: {source}")
    destination.mkdir(parents=True, exist_ok=True)
    with (destination / ".publish.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        current = destination / "current"
        previous = current.resolve() if current.is_symlink() else None
        release = Path(tempfile.mkdtemp(prefix="release-", dir=destination))
        pending = destination / ".current"
        try:
            # Copy without source SELinux labels so another container can serve the shared volume.
            subprocess.run(["cp", "-R", f"{source}/.", str(release)], check=True)
            pending.unlink(missing_ok=True)
            pending.symlink_to(release.name, target_is_directory=True)
            os.replace(pending, current)
        except BaseException:
            pending.unlink(missing_ok=True)
            shutil.rmtree(release)
            raise
        for old in destination.glob("release-*"):
            if old.is_dir() and old.resolve() not in (release.resolve(), previous):
                try:
                    shutil.rmtree(old)
                except OSError as error:
                    print(f"Release cleanup failed: {error}", file=sys.stderr)
        print(f"Published {release.name}")


if __name__ == "__main__":
    publish(Path(sys.argv[1]), Path(sys.argv[2]))

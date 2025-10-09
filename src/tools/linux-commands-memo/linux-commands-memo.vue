<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import { useFuzzySearch } from '@/composable/fuzzySearch';
import { useCopy } from '@/composable/copy';

// Linux commands data
const linuxCommands = [
  {
    name: 'File & Directory Operations',
    commands: [
      {
        name: 'ls',
        syntax: 'ls [options] [directory]',
        description: 'List directory contents',
        examples: ['ls -la /home/user', 'ls -lh']
      },
      {
        name: 'cd',
        syntax: 'cd [directory]',
        description: 'Change current directory',
        examples: ['cd /var/log', 'cd ~', 'cd ..']
      },
      {
        name: 'pwd',
        syntax: 'pwd',
        description: 'Print working directory',
        examples: []
      },
      {
        name: 'mkdir',
        syntax: 'mkdir [options] directory_name',
        description: 'Create new directory',
        examples: ['mkdir -p /path/to/new/directory', 'mkdir project{1,2,3}']
      },
      {
        name: 'rm',
        syntax: 'rm [options] file_or_directory',
        description: 'Remove files or directories',
        examples: ['rm -rf old_directory', 'rm -i *.txt']
      },
      {
        name: 'cp',
        syntax: 'cp [options] source destination',
        description: 'Copy files or directories',
        examples: ['cp -r source_dir/ dest_dir/', 'cp -p file.txt backup/']
      },
      {
        name: 'mv',
        syntax: 'mv [options] source destination',
        description: 'Move or rename files/directories',
        examples: ['mv old_name.txt new_name.txt', 'mv file.txt /destination/']
      },
      {
        name: 'touch',
        syntax: 'touch filename',
        description: 'Create empty file or update timestamp',
        examples: ['touch new_file.txt', 'touch -t 202401011200 file.txt']
      },
      {
        name: 'find',
        syntax: 'find [path] [expression]',
        description: 'Search for files and directories',
        examples: ['find /home -name "*.txt"', 'find . -type f -size +100M']
      },
      {
        name: 'locate',
        syntax: 'locate [options] pattern',
        description: 'Find files using database',
        examples: ['locate config', 'locate -i "*.pdf"']
      }
    ]
  },
  {
    name: 'File Content',
    commands: [
      {
        name: 'cat',
        syntax: 'cat [options] file',
        description: 'Display file contents',
        examples: ['cat file.txt', 'cat file1.txt file2.txt']
      },
      {
        name: 'less',
        syntax: 'less [options] file',
        description: 'View file content interactively',
        examples: ['less /var/log/syslog']
      },
      {
        name: 'more',
        syntax: 'more [options] file',
        description: 'View file content page by page',
        examples: ['more large_file.txt']
      },
      {
        name: 'head',
        syntax: 'head [options] file',
        description: 'Display first lines of file',
        examples: ['head -n 20 file.txt', 'head -c 100 file.txt']
      },
      {
        name: 'tail',
        syntax: 'tail [options] file',
        description: 'Display last lines of file',
        examples: ['tail -f /var/log/syslog', 'tail -n 50 file.txt']
      },
      {
        name: 'grep',
        syntax: 'grep [options] pattern file',
        description: 'Search for text patterns',
        examples: ['grep -r "error" /var/log/', 'grep -i "warning" *.log']
      },
      {
        name: 'sed',
        syntax: 'sed [options] \'command\' file',
        description: 'Edit text streams',
        examples: ['sed \'s/old/new/g\' file.txt', 'sed -i \'s/old/new/\' file.txt']
      },
      {
        name: 'awk',
        syntax: 'awk [options] \'pattern {action}\' file',
        description: 'Process text files',
        examples: ['awk \'{print $1, $3}\' file.txt', 'awk -F: \'{print $1}\' /etc/passwd']
      },
      {
        name: 'cut',
        syntax: 'cut [options] file',
        description: 'Extract columns from text',
        examples: ['cut -d: -f1 /etc/passwd', 'cut -c1-10 file.txt']
      },
      {
        name: 'sort',
        syntax: 'sort [options] file',
        description: 'Sort lines of text',
        examples: ['sort file.txt', 'sort -n numbers.txt']
      },
      {
        name: 'uniq',
        syntax: 'uniq [options] file',
        description: 'Remove duplicate lines',
        examples: ['uniq file.txt', 'sort file.txt | uniq']
      }
    ]
  },
  {
    name: 'System Information',
    commands: [
      {
        name: 'uname',
        syntax: 'uname [options]',
        description: 'Display system information',
        examples: ['uname -a', 'uname -r']
      },
      {
        name: 'hostname',
        syntax: 'hostname [options]',
        description: 'Display or set hostname',
        examples: ['hostname', 'hostname new-hostname']
      },
      {
        name: 'uptime',
        syntax: 'uptime',
        description: 'Show system uptime and load',
        examples: []
      },
      {
        name: 'whoami',
        syntax: 'whoami',
        description: 'Display current username',
        examples: []
      },
      {
        name: 'df',
        syntax: 'df [options]',
        description: 'Show disk space usage',
        examples: ['df -h']
      },
      {
        name: 'du',
        syntax: 'du [options] [directory]',
        description: 'Show disk usage of files/directories',
        examples: ['du -sh /home/user']
      },
      {
        name: 'free',
        syntax: 'free [options]',
        description: 'Display memory usage',
        examples: ['free -h', 'free -m']
      },
      {
        name: 'top',
        syntax: 'top',
        description: 'Display running processes',
        examples: []
      },
      {
        name: 'htop',
        syntax: 'htop',
        description: 'Interactive process monitor',
        examples: []
      }
    ]
  },
  {
    name: 'User Management',
    commands: [
      {
        name: 'useradd',
        syntax: 'useradd [options] username',
        description: 'Create new user account',
        examples: ['useradd -m -s /bin/bash newuser', 'useradd -g developers john']
      },
      {
        name: 'usermod',
        syntax: 'usermod [options] username',
        description: 'Modify user account',
        examples: ['usermod -aG sudo username', 'usermod -s /bin/zsh username']
      },
      {
        name: 'userdel',
        syntax: 'userdel [options] username',
        description: 'Delete user account',
        examples: ['userdel -r olduser', 'userdel username']
      },
      {
        name: 'passwd',
        syntax: 'passwd [username]',
        description: 'Change user password',
        examples: ['passwd', 'passwd username']
      },
      {
        name: 'su',
        syntax: 'su [options] [username]',
        description: 'Switch to another user',
        examples: ['su -', 'su username']
      },
      {
        name: 'sudo',
        syntax: 'sudo [options] command',
        description: 'Execute command as another user',
        examples: ['sudo apt update', 'sudo -u www-data ls']
      },
      {
        name: 'who',
        syntax: 'who',
        description: 'Display logged in users',
        examples: []
      },
      {
        name: 'w',
        syntax: 'w',
        description: 'Show who is logged in and what they are doing',
        examples: []
      },
      {
        name: 'last',
        syntax: 'last [options]',
        description: 'Show last login information',
        examples: ['last', 'last username']
      }
    ]
  },
  {
    name: 'Process Management',
    commands: [
      {
        name: 'ps',
        syntax: 'ps [options]',
        description: 'Display running processes',
        examples: ['ps aux', 'ps -ef']
      },
      {
        name: 'kill',
        syntax: 'kill [options] PID',
        description: 'Terminate processes',
        examples: ['kill -9 1234']
      },
      {
        name: 'killall',
        syntax: 'killall [options] process_name',
        description: 'Kill processes by name',
        examples: ['killall firefox']
      },
      {
        name: 'pkill',
        syntax: 'pkill [options] pattern',
        description: 'Kill processes by pattern',
        examples: ['pkill -f "python script.py"']
      },
      {
        name: 'jobs',
        syntax: 'jobs',
        description: 'List active jobs',
        examples: []
      },
      {
        name: 'fg',
        syntax: 'fg [job_number]',
        description: 'Bring job to foreground',
        examples: ['fg %1']
      },
      {
        name: 'bg',
        syntax: 'bg [job_number]',
        description: 'Send job to background',
        examples: ['bg %2']
      },
      {
        name: 'nice',
        syntax: 'nice [options] command',
        description: 'Run command with modified priority',
        examples: ['nice -n 10 long_task', 'nice -n -5 important_task']
      }
    ]
  },
  {
    name: 'Package Management',
    commands: [
      {
        name: 'apt',
        syntax: 'apt [options] command',
        description: 'Package management for Debian/Ubuntu',
        examples: ['apt update', 'apt install nginx', 'apt remove old-package']
      },
      {
        name: 'apt-get',
        syntax: 'apt-get [options] command',
        description: 'Legacy package management for Debian/Ubuntu',
        examples: ['apt-get update', 'apt-get install git']
      },
      {
        name: 'yum',
        syntax: 'yum [options] command',
        description: 'Package management for Red Hat/CentOS',
        examples: ['yum update', 'yum install httpd']
      },
      {
        name: 'dnf',
        syntax: 'dnf [options] command',
        description: 'Modern package management for Red Hat/CentOS',
        examples: ['dnf install git', 'dnf update']
      },
      {
        name: 'pacman',
        syntax: 'pacman [options] command',
        description: 'Package management for Arch Linux',
        examples: ['pacman -Syu', 'pacman -S vim', 'pacman -R old-package']
      }
    ]
  },
  {
    name: 'Network',
    commands: [
      {
        name: 'ping',
        syntax: 'ping [options] host',
        description: 'Test network connectivity',
        examples: ['ping google.com', 'ping -c 4 8.8.8.8']
      },
      {
        name: 'netstat',
        syntax: 'netstat [options]',
        description: 'Display network connections',
        examples: ['netstat -tulpn']
      },
      {
        name: 'ss',
        syntax: 'ss [options]',
        description: 'Display socket statistics',
        examples: ['ss -tulpn']
      },
      {
        name: 'ip',
        syntax: 'ip [options] command',
        description: 'Configure network interfaces',
        examples: ['ip addr show', 'ip route show']
      },
      {
        name: 'ifconfig',
        syntax: 'ifconfig [interface]',
        description: 'Configure network interfaces (legacy)',
        examples: ['ifconfig eth0']
      },
      {
        name: 'curl',
        syntax: 'curl [options] URL',
        description: 'Transfer data from servers',
        examples: ['curl -O https://example.com/file.zip']
      },
      {
        name: 'wget',
        syntax: 'wget [options] URL',
        description: 'Download files from web',
        examples: ['wget -c https://example.com/large-file.iso']
      },
      {
        name: 'ssh',
        syntax: 'ssh [options] user@host',
        description: 'Secure shell remote access',
        examples: ['ssh user@server.com']
      },
      {
        name: 'scp',
        syntax: 'scp [options] source destination',
        description: 'Secure copy files',
        examples: ['scp file.txt user@server:/path/']
      },
      {
        name: 'nc',
        syntax: 'nc [options] host port',
        description: 'Network utility for reading/writing data',
        examples: ['nc -l 8080', 'nc server.com 22']
      }
    ]
  },
  {
    name: 'Permissions',
    commands: [
      {
        name: 'chmod',
        syntax: 'chmod [options] mode file',
        description: 'Change file permissions',
        examples: ['chmod 755 script.sh', 'chmod +x executable', 'chmod u+w file.txt']
      },
      {
        name: 'chown',
        syntax: 'chown [options] owner[:group] file',
        description: 'Change file ownership',
        examples: ['chown user:group file.txt', 'chown -R www-data /var/www/']
      },
      {
        name: 'chgrp',
        syntax: 'chgrp [options] group file',
        description: 'Change file group',
        examples: ['chgrp developers file.txt', 'chgrp -R users /shared/']
      },
      {
        name: 'umask',
        syntax: 'umask [value]',
        description: 'Set default file permissions',
        examples: ['umask 022', 'umask']
      }
    ]
  },
  {
    name: 'System Services',
    commands: [
      {
        name: 'systemctl',
        syntax: 'systemctl [command] service_name',
        description: 'Control system services',
        examples: ['systemctl start nginx', 'systemctl enable nginx', 'systemctl status nginx']
      },
      {
        name: 'service',
        syntax: 'service service_name [command]',
        description: 'Control services (legacy)',
        examples: ['service nginx start', 'service nginx status']
      },
      {
        name: 'journalctl',
        syntax: 'journalctl [options]',
        description: 'View systemd journal logs',
        examples: ['journalctl -u nginx', 'journalctl -f', 'journalctl --since "1 hour ago"']
      }
    ]
  },
  {
    name: 'Archives & Compression',
    commands: [
      {
        name: 'tar',
        syntax: 'tar [options] archive_name files',
        description: 'Create and extract archives',
        examples: ['tar -czf backup.tar.gz /home/user', 'tar -xzf backup.tar.gz']
      },
      {
        name: 'gzip',
        syntax: 'gzip [options] file',
        description: 'Compress files',
        examples: ['gzip large_file.txt']
      },
      {
        name: 'gunzip',
        syntax: 'gunzip [options] file',
        description: 'Decompress files',
        examples: ['gunzip file.txt.gz']
      },
      {
        name: 'zip',
        syntax: 'zip [options] archive_name files',
        description: 'Create ZIP archives',
        examples: ['zip -r backup.zip /home/user']
      },
      {
        name: 'unzip',
        syntax: 'unzip [options] archive_name',
        description: 'Extract ZIP archives',
        examples: ['unzip backup.zip']
      }
    ]
  },
  {
    name: 'Disk Management',
    commands: [
      {
        name: 'mount',
        syntax: 'mount [options] device directory',
        description: 'Mount filesystems',
        examples: ['mount /dev/sdb1 /mnt/usb']
      },
      {
        name: 'umount',
        syntax: 'umount [options] device_or_directory',
        description: 'Unmount filesystems',
        examples: ['umount /mnt/usb']
      },
      {
        name: 'fdisk',
        syntax: 'fdisk [options] device',
        description: 'Manage disk partitions',
        examples: ['fdisk -l', 'fdisk /dev/sda']
      },
      {
        name: 'lsblk',
        syntax: 'lsblk [options]',
        description: 'List all block devices',
        examples: ['lsblk', 'lsblk -f']
      }
    ]
  },
  {
    name: 'Text Editors',
    commands: [
      {
        name: 'vim',
        syntax: 'vim [options] file',
        description: 'Edit files with Vim',
        examples: ['vim file.txt', 'vim /etc/hosts']
      },
      {
        name: 'vi',
        syntax: 'vi [options] file',
        description: 'Edit files with Vi',
        examples: ['vi file.txt']
      },
      {
        name: 'nano',
        syntax: 'nano [options] file',
        description: 'Edit files with Nano',
        examples: ['nano file.txt', 'nano /etc/hosts']
      }
    ]
  }
];

const themeVars = useThemeVars();
const searchQuery = ref('');

// Flatten all commands for search
const allCommands = computed(() => 
  linuxCommands.flatMap((category: any) => 
    category.commands.map((command: any) => ({
      ...command,
      category: category.name,
      searchText: `${command.name} ${command.description} ${command.examples?.join(' ') || ''} ${category.name}`.toLowerCase()
    }))
  )
);

const { searchResult } = useFuzzySearch({
  search: searchQuery,
  data: allCommands.value,
  options: {
    keys: [
      { name: 'name', weight: 3 },
      { name: 'description', weight: 2 },
      { name: 'category', weight: 1 },
      { name: 'examples', weight: 1 }
    ],
    threshold: 0.3,
    useExtendedSearch: true,
    isCaseSensitive: false,
  },
});

// Group search results by category
const searchResultsByCategory = computed(() => {
  if (!searchQuery.value) return [];
  
  const grouped = searchResult.value.reduce((acc: any, command: any) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as any);
  
  return Object.entries(grouped).map(([category, commands]) => ({
    name: category,
    commands
  }));
});

// Copy functionality
const { copy: copyCommand } = useCopy();

function copyToClipboard(text: string) {
  copyCommand(text);
}

// Category navigation
const categories = computed(() => linuxCommands.map((cat: any) => cat.name));
const selectedCategory = ref<string | null>(null);

// Debug logging for category selection
function selectCategory(category: string) {
  // console.log('Selecting category:', category);
  if (selectedCategory.value === category) {
    selectedCategory.value = null;
  } else {
    selectedCategory.value = category;
  }
  // console.log('Selected category is now:', selectedCategory.value);
}

function clearSelection() {
  // console.log('Clearing selection');
  selectedCategory.value = null;
}

// Computed property for selected category commands
const selectedCategoryCommands = computed(() => {
  if (!selectedCategory.value) return [];
  const category = linuxCommands.find(cat => cat.name === selectedCategory.value);
  // console.log('Found category:', category);
  // console.log('Commands for selected category:', category?.commands?.length || 0);
  return category?.commands || [];
});

// Filter commands by selected category
const filteredCommands = computed(() => {
  if (selectedCategory.value) {
    return linuxCommands.filter((cat: any) => cat.name === selectedCategory.value);
  }
  return linuxCommands;
});
</script>

<template>
  <div class="linux-commands-memo">
    <!-- Search and Navigation -->
    <div class="search-section" mb-6>
      <c-input-text
        v-model:value="searchQuery"
        placeholder="Search Linux commands..."
        autofocus
        raw-text
        clearable
        class="search-input"
      />
      
      <!-- Category Navigation -->
      <div v-if="!searchQuery" class="category-nav" mt-4>
        <div class="category-nav-title" mb-2>
          Quick Navigation:
        </div>
        
        <!-- Debug Info -->
        <!-- <div class="debug-info" mb-2 p-2 style="background: #f0f0f0; border-radius: 4px; font-size: 0.8rem;">
          <strong>Debug:</strong> Selected: "{{ selectedCategory }}" | Commands: {{ selectedCategoryCommands.length }}
        </div> -->
        <div class="category-buttons" flex flex-wrap gap-2>
          <c-button
            v-for="category in categories"
            :key="category"
            :type="selectedCategory === category ? 'primary' : 'default'"
            size="small"
            @click="selectCategory(category)"
          >
            {{ category }}
            <span class="command-count">({{ linuxCommands.find(cat => cat.name === category)?.commands.length || 0 }})</span>
          </c-button>
        </div>
      </div>
    </div>

    <!-- Search Results -->
    <div v-if="searchQuery && searchResultsByCategory.length > 0">
      <div v-for="category in searchResultsByCategory" :key="category.name" mb-6>
        <h2 class="category-title" mb-4>
          {{ category.name }}
          <span class="result-count">({{ (category.commands as any[]).length }} results)</span>
        </h2>
        
        <div class="commands-grid">
          <c-card
            v-for="command in (category.commands as any[])"
            :key="(command as any).name"
            class="command-card"
          >
            <div class="command-header">
              <h3 class="command-name">{{ (command as any).name }}</h3>
              <c-button
                type="default"
                size="small"
                circle
                @click="copyToClipboard((command as any).syntax)"
              >
                <icon-mdi-content-copy />
              </c-button>
            </div>
            
            <p class="command-description">{{ (command as any).description }}</p>
            
            <div class="command-syntax">
              <code>{{ (command as any).syntax }}</code>
            </div>
            
            <div v-if="(command as any).examples" class="command-examples">
              <div class="examples-title">Examples:</div>
              <div v-for="example in (command as any).examples" :key="example" class="example">
                <code>{{ example }}</code>
                <c-button
                  type="default"
                  size="small"
                  circle
                  @click="copyToClipboard(example)"
                >
                  <icon-mdi-content-copy />
                </c-button>
              </div>
            </div>
          </c-card>
        </div>
      </div>
    </div>

    <!-- No Search Results -->
    <div v-else-if="searchQuery && searchResultsByCategory.length === 0" class="no-results">
      <div class="no-results-icon">🔍</div>
      <h3>No commands found</h3>
      <p>Try searching for a different term or browse by category below.</p>
    </div>

    <!-- Category View -->
    <div v-else>
      <!-- Show selected category expanded -->
      <div v-if="selectedCategory" mb-6>
        <div class="selected-category-header" flex items-center justify-between mb-4>
          <h2 class="category-title" mb-0>
            {{ selectedCategory }}
          </h2>
          <c-button
            type="default"
            size="small"
            @click="clearSelection"
          >
            <icon-mdi-close class="mr-1" />
            Clear Selection
          </c-button>
        </div>
        <div v-if="selectedCategoryCommands.length" class="commands-grid">
          <c-card
            v-for="command in selectedCategoryCommands"
            :key="(command as any).name"
            class="command-card"
          >
            <div class="command-header">
              <h3 class="command-name">{{ (command as any).name }}</h3>
              <c-button
                type="default"
                size="small"
                circle
                @click="copyToClipboard((command as any).syntax)"
              >
                <icon-mdi-content-copy />
              </c-button>
            </div>
            
            <p class="command-description">{{ (command as any).description }}</p>
            
            <div class="command-syntax">
              <code>{{ (command as any).syntax }}</code>
            </div>
            
            <div v-if="(command as any).examples" class="command-examples">
              <div class="examples-title">Examples:</div>
              <div v-for="example in (command as any).examples" :key="example" class="example">
                <code>{{ example }}</code>
                <c-button
                  type="default"
                  size="small"
                  circle
                  @click="copyToClipboard(example)"
                >
                  <icon-mdi-content-copy />
                </c-button>
              </div>
            </div>
          </c-card>
        </div>
        
        <div v-else class="no-commands">
          <p>No commands found in this category.</p>
        </div>
      </div>
      
      <!-- Show all categories collapsed when no specific category is selected -->
      <div v-else>
        <c-collapse
          v-for="category in linuxCommands"
          :key="category.name"
          :title="category.name"
          class="category-collapse"
        >
          <div class="commands-grid">
            <c-card
              v-for="command in (category.commands as any[])"
              :key="(command as any).name"
              class="command-card"
            >
              <div class="command-header">
                <h3 class="command-name">{{ (command as any).name }}</h3>
                <c-button
                  type="default"
                  size="small"
                  circle
                  @click="copyToClipboard((command as any).syntax)"
                >
                  <icon-mdi-content-copy />
                </c-button>
              </div>
              
              <p class="command-description">{{ (command as any).description }}</p>
              
              <div class="command-syntax">
                <code>{{ (command as any).syntax }}</code>
              </div>
              
              <div v-if="(command as any).examples" class="command-examples">
                <div class="examples-title">Examples:</div>
                <div v-for="example in (command as any).examples" :key="example" class="example">
                  <code>{{ example }}</code>
                  <c-button
                    type="default"
                    size="small"
                    circle
                    @click="copyToClipboard(example)"
                  >
                    <icon-mdi-content-copy />
                  </c-button>
                </div>
              </div>
            </c-card>
          </div>
        </c-collapse>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.linux-commands-memo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.search-section {
  .search-input {
    max-width: 500px;
  }
  
  .category-nav {
    .category-nav-title {
      font-weight: 500;
      color: v-bind('themeVars.textColor2');
    }
    
    .category-buttons {
      gap: 8px;
      
      .command-count {
        font-size: 0.75rem;
        opacity: 0.7;
        margin-left: 4px;
      }
    }
  }
}

.category-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: v-bind('themeVars.textColor1');
  
  .result-count {
    font-size: 0.875rem;
    font-weight: 400;
    color: v-bind('themeVars.textColor3');
    margin-left: 8px;
  }
}

.selected-category-header {
  .category-title {
    margin-bottom: 0;
  }
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.command-card {
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  .command-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: v-bind('themeVars.textColor1');
    margin: 0;
  }
}

.command-description {
  color: v-bind('themeVars.textColor2');
  margin-bottom: 12px;
  line-height: 1.5;
}

.command-syntax {
  background-color: v-bind('themeVars.cardColor');
  border: 1px solid v-bind('themeVars.borderColor');
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
  
  code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    color: v-bind('themeVars.textColor1');
    background: none;
    padding: 0;
  }
}

.command-examples {
  .examples-title {
    font-weight: 500;
    color: v-bind('themeVars.textColor2');
    margin-bottom: 8px;
    font-size: 0.875rem;
  }
  
  .example {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    
    code {
      flex: 1;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.8rem;
      background-color: v-bind('themeVars.cardColor');
      border: 1px solid v-bind('themeVars.borderColor');
      border-radius: 3px;
      padding: 6px 8px;
      color: v-bind('themeVars.textColor1');
    }
  }
}

.category-collapse {
  margin-bottom: 24px;
  
  :deep(.c-collapse) {
    .commands-grid {
      margin-top: 16px;
    }
  }
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  color: v-bind('themeVars.textColor2');
  
  .no-results-icon {
    font-size: 3rem;
    margin-bottom: 16px;
  }
  
  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: v-bind('themeVars.textColor1');
  }
  
  p {
    font-size: 0.875rem;
    line-height: 1.5;
  }
}

.no-commands {
  text-align: center;
  padding: 40px 20px;
  color: v-bind('themeVars.textColor2');
  
  p {
    font-size: 0.875rem;
    line-height: 1.5;
  }
}

// Responsive design
@media (max-width: 768px) {
  .commands-grid {
    grid-template-columns: 1fr;
  }
  
  .category-buttons {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
